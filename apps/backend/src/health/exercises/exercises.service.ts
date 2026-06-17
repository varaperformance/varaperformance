import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { Prisma } from '@generated/prisma';
import {
  ExerciseDbService,
  type NormalizedExternalExercise,
} from './exercisedb.service';
import type {
  ExerciseResponse,
  ExerciseListData,
  ExerciseFilters,
  SuccessResponse,
  ErrorResponse,
  PaginatedResponse,
  CreateExercise,
  UpdateExercise,
} from '@varaperformance/core';

@Injectable()
export class ExerciseService {
  constructor(
    private readonly db: DatabaseService,
    private readonly exerciseDb: ExerciseDbService,
  ) {}

  /**
   * Get all exercises with optional filters
   */
  async getExercises(
    filters: ExerciseFilters,
    userId?: string,
  ): Promise<SuccessResponse<ExerciseListData>> {
    const {
      category,
      muscleGroup,
      equipment,
      difficulty,
      search,
      page = 1,
      limit = 50,
    } = filters;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };

    if (category) {
      where.category = category;
    }
    if (difficulty) {
      where.difficulty = difficulty;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by muscle group via join table
    if (muscleGroup) {
      where.muscleGroups = {
        some: { muscleGroup },
      };
    }

    // Filter by equipment via join table
    if (equipment) {
      where.equipmentNeeded = {
        some: { equipment },
      };
    }

    const [exercises, total] = await Promise.all([
      this.db.exercise.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          muscleGroups: true,
          equipmentNeeded: true,
        },
      }),
      this.db.exercise.count({ where }),
    ]);

    if (search && page === 1) {
      const externalLimit = Math.min(25, Math.max(10, limit));
      const external = await this.exerciseDb.search(search, externalLimit);
      const imported = await this.importExternalExercises(external);

      // Collect all candidate IDs (local + imported)
      const allIds = new Set<string>();
      for (const ex of exercises) allIds.add(ex.id);
      for (const ex of imported) allIds.add(ex.id);

      // Rank by trigram similarity in SQL
      const ranked =
        allIds.size > 0
          ? await this.rankExerciseIds(
              search,
              Array.from(allIds),
              limit,
              userId,
            )
          : [];

      // Fetch full objects in ranked order
      const byId = new Map<string, any>();
      for (const ex of exercises) byId.set(ex.id, ex);
      for (const ex of imported) byId.set(ex.id, ex);

      const merged = ranked
        .map((id) => byId.get(id))
        .filter(Boolean)
        .slice(0, limit);

      const items: ExerciseResponse[] = merged.map((exercise) =>
        this.formatExerciseResponse(exercise),
      );

      return {
        success: true,
        data: {
          items,
          total: Math.max(total, allIds.size),
          page,
          limit,
        },
      };
    }

    const items: ExerciseResponse[] = exercises.map((exercise) =>
      this.formatExerciseResponse(exercise),
    );

    return {
      success: true,
      data: { items, total, page, limit },
    };
  }

  /**
   * Get a single exercise by slug
   */
  async getExerciseBySlug(
    slug: string,
  ): Promise<SuccessResponse<ExerciseResponse> | ErrorResponse> {
    let exercise = await this.db.exercise.findUnique({
      where: { slug },
      include: {
        muscleGroups: true,
        equipmentNeeded: true,
      },
    });

    if (!exercise) {
      const query = slug.replace(/-/g, ' ');
      const external = await this.exerciseDb.search(query, 8);
      const imported = await this.importExternalExercises(external);
      exercise = imported.find((candidate) => candidate.slug === slug) ?? null;
    }

    if (!exercise) {
      return {
        success: false,
        error: { code: 'EXERCISE_NOT_FOUND', message: 'Exercise not found' },
      };
    }

    return { success: true, data: this.formatExerciseResponse(exercise) };
  }

  /**
   * Get a single exercise by ID (admin)
   */
  async getExerciseById(
    id: string,
  ): Promise<SuccessResponse<ExerciseResponse> | ErrorResponse> {
    const exercise = await this.db.exercise.findUnique({
      where: { id },
      include: {
        muscleGroups: true,
        equipmentNeeded: true,
      },
    });

    if (!exercise) {
      return {
        success: false,
        error: { code: 'EXERCISE_NOT_FOUND', message: 'Exercise not found' },
      };
    }

    return { success: true, data: this.formatExerciseResponse(exercise) };
  }

  /**
   * Get all exercises for admin (includes inactive)
   */
  async getExercisesAdmin(
    filters: ExerciseFilters,
  ): Promise<PaginatedResponse<ExerciseResponse>> {
    const {
      category,
      muscleGroup,
      equipment,
      difficulty,
      search,
      page = 1,
      limit = 20,
    } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (muscleGroup) {
      where.muscleGroups = { some: { muscleGroup } };
    }
    if (equipment) {
      where.equipmentNeeded = { some: { equipment } };
    }

    const [exercises, total] = await Promise.all([
      this.db.exercise.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          muscleGroups: true,
          equipmentNeeded: true,
        },
      }),
      this.db.exercise.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: exercises.map((e) => this.formatExerciseResponse(e)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + exercises.length < total,
      },
    };
  }

  /**
   * Create a new exercise
   */
  async createExercise(
    data: CreateExercise,
  ): Promise<SuccessResponse<ExerciseResponse>> {
    const { muscleGroups, equipment, ...exerciseData } = data;

    const exercise = await this.db.exercise.create({
      data: {
        slug: exerciseData.slug,
        name: exerciseData.name,
        category: exerciseData.category,
        difficulty: exerciseData.difficulty,
        description: exerciseData.description ?? '',
        instructions: exerciseData.instructions ?? [],
        tips: exerciseData.tips ?? [],
        variations: exerciseData.variations ?? [],
        videoUrl: exerciseData.videoUrl,
        thumbnailUrl: exerciseData.thumbnailUrl,
        isActive: exerciseData.isActive ?? true,
        muscleGroups: muscleGroups?.length
          ? {
              create: muscleGroups.map((mg) => ({
                muscleGroup: mg,
                isPrimary: muscleGroups.indexOf(mg) === 0,
              })),
            }
          : undefined,
        equipmentNeeded: equipment?.length
          ? {
              create: equipment.map((eq) => ({
                equipment: eq,
                isRequired: true,
              })),
            }
          : undefined,
      },
      include: {
        muscleGroups: true,
        equipmentNeeded: true,
      },
    });

    return { success: true, data: this.formatExerciseResponse(exercise) };
  }

  /**
   * Update an exercise
   */
  async updateExercise(
    id: string,
    data: UpdateExercise,
  ): Promise<SuccessResponse<ExerciseResponse> | ErrorResponse> {
    const existing = await this.db.exercise.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false,
        error: { code: 'EXERCISE_NOT_FOUND', message: 'Exercise not found' },
      };
    }

    const { muscleGroups, equipment, ...exerciseData } = data;

    // Delete existing relations if new ones provided
    if (muscleGroups !== undefined) {
      await this.db.exerciseMuscleGroup.deleteMany({
        where: { exerciseId: id },
      });
    }
    if (equipment !== undefined) {
      await this.db.exerciseEquipment.deleteMany({ where: { exerciseId: id } });
    }

    const exercise = await this.db.exercise.update({
      where: { id },
      data: {
        ...(exerciseData.slug !== undefined && { slug: exerciseData.slug }),
        ...(exerciseData.name !== undefined && { name: exerciseData.name }),
        ...(exerciseData.category !== undefined && {
          category: exerciseData.category,
        }),
        ...(exerciseData.difficulty !== undefined && {
          difficulty: exerciseData.difficulty,
        }),
        ...(exerciseData.description !== undefined && {
          description: exerciseData.description,
        }),
        ...(exerciseData.instructions !== undefined && {
          instructions: exerciseData.instructions,
        }),
        ...(exerciseData.tips !== undefined && { tips: exerciseData.tips }),
        ...(exerciseData.variations !== undefined && {
          variations: exerciseData.variations,
        }),
        ...(exerciseData.videoUrl !== undefined && {
          videoUrl: exerciseData.videoUrl,
        }),
        ...(exerciseData.thumbnailUrl !== undefined && {
          thumbnailUrl: exerciseData.thumbnailUrl,
        }),
        ...(exerciseData.isActive !== undefined && {
          isActive: exerciseData.isActive,
        }),
        muscleGroups: muscleGroups?.length
          ? {
              create: muscleGroups.map((mg) => ({
                muscleGroup: mg,
                isPrimary: muscleGroups.indexOf(mg) === 0,
              })),
            }
          : undefined,
        equipmentNeeded: equipment?.length
          ? {
              create: equipment.map((eq) => ({
                equipment: eq,
                isRequired: true,
              })),
            }
          : undefined,
      },
      include: {
        muscleGroups: true,
        equipmentNeeded: true,
      },
    });

    return { success: true, data: this.formatExerciseResponse(exercise) };
  }

  /**
   * Toggle exercise active status
   */
  async toggleExercise(
    id: string,
  ): Promise<
    SuccessResponse<{ id: string; isActive: boolean }> | ErrorResponse
  > {
    const exercise = await this.db.exercise.findUnique({ where: { id } });
    if (!exercise) {
      return {
        success: false,
        error: { code: 'EXERCISE_NOT_FOUND', message: 'Exercise not found' },
      };
    }

    const updated = await this.db.exercise.update({
      where: { id },
      data: { isActive: !exercise.isActive },
      select: { id: true, isActive: true },
    });

    return { success: true, data: updated };
  }

  /**
   * Delete an exercise
   */
  async deleteExercise(
    id: string,
  ): Promise<SuccessResponse<{ id: string }> | ErrorResponse> {
    const existing = await this.db.exercise.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false,
        error: { code: 'EXERCISE_NOT_FOUND', message: 'Exercise not found' },
      };
    }

    // Delete related records first
    await this.db.exerciseMuscleGroup.deleteMany({ where: { exerciseId: id } });
    await this.db.exerciseEquipment.deleteMany({ where: { exerciseId: id } });
    await this.db.exercise.delete({ where: { id } });

    return { success: true, data: { id } };
  }

  /**
   * Check if a slug is available
   */
  async checkSlug(
    slug: string,
    excludeId?: string,
  ): Promise<SuccessResponse<{ available: boolean }>> {
    const existing = await this.db.exercise.findUnique({
      where: { slug },
      select: { id: true },
    });

    const available = !existing || existing.id === excludeId;

    return { success: true, data: { available } };
  }

  /**
   * Format exercise response
   */

  private formatExerciseResponse(exercise: any): ExerciseResponse {
    return {
      id: exercise.id,
      slug: exercise.slug,
      name: exercise.name,
      category: exercise.category as ExerciseResponse['category'],
      difficulty: exercise.difficulty as ExerciseResponse['difficulty'],
      description: exercise.description,
      instructions: exercise.instructions,
      tips: exercise.tips,
      variations: exercise.variations,
      videoUrl: exercise.videoUrl,
      thumbnailUrl: exercise.thumbnailUrl,
      isActive: exercise.isActive,
      createdAt: exercise.createdAt,
      updatedAt: exercise.updatedAt,
      muscleGroups: exercise.muscleGroups.map(
        (mg: { muscleGroup: string; isPrimary: boolean }) => ({
          muscleGroup:
            mg.muscleGroup as ExerciseResponse['muscleGroups'][0]['muscleGroup'],
          isPrimary: mg.isPrimary,
        }),
      ),
      equipment: exercise.equipmentNeeded.map(
        (eq: { equipment: string; isRequired: boolean }) => ({
          equipment:
            eq.equipment as ExerciseResponse['equipment'][0]['equipment'],
          isRequired: eq.isRequired,
        }),
      ),
    };
  }

  private async importExternalExercises(
    exercises: NormalizedExternalExercise[],
  ) {
    const imported: any[] = [];

    for (const external of exercises) {
      const existing = await this.db.exercise.findFirst({
        where: {
          OR: [{ slug: external.slug }, { name: external.name }],
        },
        include: {
          muscleGroups: true,
          equipmentNeeded: true,
        },
      });

      if (existing) {
        imported.push(existing);
        continue;
      }

      const created = await this.db.exercise.create({
        data: {
          slug: external.slug,
          name: external.name,
          category: external.category,
          difficulty: external.difficulty,
          description: external.description,
          instructions: external.instructions,
          tips: external.tips,
          variations: external.variations,
          videoUrl: external.videoUrl,
          thumbnailUrl: external.thumbnailUrl,
          isActive: true,
          muscleGroups: {
            create: external.muscleGroups.map((group) => ({
              muscleGroup: group.muscleGroup,
              isPrimary: group.isPrimary,
            })),
          },
          equipmentNeeded: {
            create: external.equipment.map((equipment) => ({
              equipment: equipment.equipment,
              isRequired: equipment.isRequired,
            })),
          },
        },
        include: {
          muscleGroups: true,
          equipmentNeeded: true,
        },
      });

      imported.push(created);
    }

    return imported;
  }

  /**
   * Rank exercise IDs by trigram similarity (pg_trgm).
   * Scoring: exact name (0) > prefix (1) > word boundary (2) > name similarity > description similarity
   */
  private async rankExerciseIds(
    query: string,
    candidateIds: string[],
    limit: number,
    userId?: string,
  ): Promise<string[]> {
    if (candidateIds.length === 0) return [];

    const personalBoost = userId
      ? Prisma.sql`LEFT JOIN "workouts" w ON w."exerciseId" = e."id"
        LEFT JOIN "workout_sessions" ws ON ws."id" = w."sessionId" AND ws."userId" = ${userId}`
      : Prisma.sql``;

    const personalScore = userId
      ? Prisma.sql`- CASE WHEN COUNT(ws."id") > 0 THEN 1.0 ELSE 0 END`
      : Prisma.sql``;

    const ranked = await this.db.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT e."id",
        CASE
          WHEN LOWER(e."name") = LOWER(${query}) THEN 0
          WHEN LOWER(e."name") LIKE LOWER(${query}) || '%' THEN 1
          WHEN LOWER(e."name") ~ ('\m' || LOWER(${query})) THEN 2
          WHEN LOWER(e."name") LIKE '%' || LOWER(${query}) || '%' THEN 3
          WHEN similarity(e."name", ${query}) > 0.1 THEN 4.0 - similarity(e."name", ${query})
          WHEN similarity(e."description", ${query}) > 0.1 THEN 5.0 - similarity(e."description", ${query})
          ELSE 6
        END
        ${personalScore}
        AS rank
      FROM "Exercise" e
      ${personalBoost}
      WHERE e."id" = ANY(${candidateIds})
      GROUP BY e."id", e."name", e."description"
      ORDER BY rank ASC, e."name" ASC
      LIMIT ${limit}
    `);

    return ranked.map((r) => r.id);
  }
}
