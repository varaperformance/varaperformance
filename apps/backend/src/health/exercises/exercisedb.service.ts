import { Injectable, Logger } from '@nestjs/common';
import {
  Equipment,
  ExerciseCategory,
  ExerciseDifficulty,
  MuscleGroup,
} from '@varaperformance/core';

interface ExerciseDbSearchResponse {
  success?: boolean;
  data?: ExerciseDbExercise[];
}

interface ExerciseDbExercise {
  exerciseId?: string;
  name?: string;
  gifUrl?: string;
  targetMuscles?: string[];
  bodyParts?: string[];
  equipments?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
}

export interface NormalizedExternalExercise {
  slug: string;
  name: string;
  category: ExerciseCategory;
  difficulty: ExerciseDifficulty;
  description: string;
  instructions: string[];
  tips: string[];
  variations: string[];
  videoUrl: string | null;
  thumbnailUrl: string | null;
  muscleGroups: { muscleGroup: MuscleGroup; isPrimary: boolean }[];
  equipment: { equipment: Equipment; isRequired: boolean }[];
}

@Injectable()
export class ExerciseDbService {
  private readonly logger = new Logger(ExerciseDbService.name);
  private readonly baseUrl = (
    process.env.EXERCISEDB_BASE_URL?.trim() || 'https://exercisedb.dev/api/v1'
  ).replace(/\/+$/, '');

  async search(
    query: string,
    limit = 25,
  ): Promise<NormalizedExternalExercise[]> {
    const q = query.trim();
    if (!q) {
      return [];
    }

    const constrainedLimit = Math.max(1, Math.min(25, limit));
    const baseThreshold = this.getFuzzyThreshold(q);
    const thresholds = [baseThreshold, 0.35, 0.5].filter(
      (value, index, arr) => arr.indexOf(value) === index,
    );

    for (const threshold of thresholds) {
      const records = await this.fetchRawExercises(
        q,
        constrainedLimit,
        threshold,
      );
      if (records.length === 0) {
        continue;
      }

      return records
        .map((record) => this.normalizeRecord(record))
        .filter(
          (record): record is NormalizedExternalExercise => record !== null,
        );
    }

    return [];
  }

  private async fetchRawExercises(
    query: string,
    limit: number,
    threshold: number,
  ): Promise<ExerciseDbExercise[]> {
    const url = new URL(`${this.baseUrl}/exercises/search`);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', '0');
    url.searchParams.set('threshold', String(threshold));

    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.warn(
          `ExerciseDB search failed (${response.status}) for query: ${query}`,
        );
        return [];
      }

      const payload = (await response.json()) as ExerciseDbSearchResponse;
      return payload?.data ?? [];
    } catch (error) {
      this.logger.warn(
        `ExerciseDB request error for query "${query}" at threshold ${threshold}`,
        error,
      );
      return [];
    }
  }

  private normalizeRecord(
    record: ExerciseDbExercise,
  ): NormalizedExternalExercise | null {
    const name = (record.name ?? '').trim();
    if (!name) {
      return null;
    }

    const exerciseId = (record.exerciseId ?? '').trim();
    const slugBase = this.slugify(name);
    const slug = exerciseId ? `${slugBase}-${exerciseId}` : slugBase;

    const targetMuscles = (record.targetMuscles ?? [])
      .map((m) => this.mapMuscleGroup(m))
      .filter((m): m is MuscleGroup => Boolean(m));

    const secondaryMuscles = (record.secondaryMuscles ?? [])
      .map((m) => this.mapMuscleGroup(m))
      .filter((m): m is MuscleGroup => Boolean(m));

    const muscleGroups = this.buildMuscleGroups(
      targetMuscles,
      secondaryMuscles,
    );

    const equipment = (record.equipments ?? [])
      .map((e) => this.mapEquipment(e))
      .filter((e): e is Equipment => Boolean(e));

    const normalizedEquipment =
      equipment.length > 0
        ? equipment.map((e, index) => ({
            equipment: e,
            isRequired: index === 0,
          }))
        : [{ equipment: 'BODYWEIGHT' as Equipment, isRequired: false }];

    const bodyParts = (record.bodyParts ?? []).map((b) => b.toLowerCase());

    return {
      slug,
      name,
      category: this.mapCategory(bodyParts, normalizedEquipment),
      difficulty: this.mapDifficulty(record.instructions ?? []),
      description: this.buildDescription(
        name,
        bodyParts,
        targetMuscles,
        normalizedEquipment,
      ),
      instructions:
        record.instructions && record.instructions.length > 0
          ? record.instructions
          : [
              'Perform the movement with controlled form and full range of motion.',
            ],
      tips: ['Keep core braced and maintain controlled tempo.'],
      variations: (record.secondaryMuscles ?? []).slice(0, 3),
      videoUrl: null,
      thumbnailUrl: record.gifUrl ?? null,
      muscleGroups,
      equipment: normalizedEquipment,
    };
  }

  private buildMuscleGroups(
    targetMuscles: MuscleGroup[],
    secondaryMuscles: MuscleGroup[],
  ): { muscleGroup: MuscleGroup; isPrimary: boolean }[] {
    const combined = [...targetMuscles, ...secondaryMuscles];
    const unique: MuscleGroup[] = [];

    for (const group of combined) {
      if (!unique.includes(group)) {
        unique.push(group);
      }
    }

    if (unique.length === 0) {
      return [{ muscleGroup: 'FULL_BODY', isPrimary: true }];
    }

    return unique.map((muscleGroup, index) => ({
      muscleGroup,
      isPrimary: index === 0,
    }));
  }

  private mapCategory(
    bodyParts: string[],
    equipment: { equipment: Equipment; isRequired: boolean }[],
  ): ExerciseCategory {
    if (equipment.some((eq) => eq.equipment === 'CARDIO_MACHINE')) {
      return 'CARDIO';
    }

    if (bodyParts.some((bodyPart) => bodyPart.includes('cardio'))) {
      return 'CARDIO';
    }

    if (
      bodyParts.some((bodyPart) =>
        ['waist', 'neck', 'lower arms', 'upper arms'].includes(bodyPart),
      )
    ) {
      return 'BODYWEIGHT';
    }

    return 'STRENGTH';
  }

  private mapDifficulty(instructions: string[]): ExerciseDifficulty {
    if (instructions.length >= 6) {
      return 'ADVANCED';
    }

    if (instructions.length >= 4) {
      return 'INTERMEDIATE';
    }

    return 'BEGINNER';
  }

  private mapMuscleGroup(value: string): MuscleGroup | null {
    const normalized = value.toLowerCase();

    if (normalized.includes('chest') || normalized.includes('pectoral')) {
      return 'CHEST';
    }
    if (normalized.includes('lat') || normalized.includes('back')) {
      return 'BACK';
    }
    if (normalized.includes('shoulder') || normalized.includes('delt')) {
      return 'SHOULDERS';
    }
    if (normalized.includes('bicep')) {
      return 'BICEPS';
    }
    if (normalized.includes('tricep')) {
      return 'TRICEPS';
    }
    if (
      normalized.includes('quad') ||
      normalized.includes('hamstring') ||
      normalized.includes('calf') ||
      normalized.includes('thigh')
    ) {
      return 'LEGS';
    }
    if (normalized.includes('glute')) {
      return 'GLUTES';
    }
    if (
      normalized.includes('abs') ||
      normalized.includes('core') ||
      normalized.includes('oblique')
    ) {
      return 'CORE';
    }

    return null;
  }

  private mapEquipment(value: string): Equipment | null {
    const normalized = value.toLowerCase();

    if (normalized.includes('barbell')) {
      return 'BARBELL';
    }
    if (normalized.includes('dumbbell')) {
      return 'DUMBBELL';
    }
    if (normalized.includes('cable')) {
      return 'CABLE';
    }
    if (
      normalized.includes('machine') ||
      normalized.includes('lever') ||
      normalized.includes('smith')
    ) {
      return 'MACHINE';
    }
    if (normalized.includes('kettlebell')) {
      return 'KETTLEBELL';
    }
    if (normalized.includes('band')) {
      return 'RESISTANCE_BAND';
    }
    if (
      normalized.includes('treadmill') ||
      normalized.includes('bike') ||
      normalized.includes('rower') ||
      normalized.includes('elliptical') ||
      normalized.includes('stair')
    ) {
      return 'CARDIO_MACHINE';
    }
    if (
      normalized.includes('body weight') ||
      normalized.includes('bodyweight')
    ) {
      return 'BODYWEIGHT';
    }

    return null;
  }

  private buildDescription(
    name: string,
    bodyParts: string[],
    targetMuscles: MuscleGroup[],
    equipment: { equipment: Equipment; isRequired: boolean }[],
  ): string {
    const muscleLabel =
      targetMuscles.length > 0
        ? targetMuscles
            .map((m) => m.toLowerCase().replace('_', ' '))
            .join(' and ')
        : (bodyParts[0] ?? 'multiple muscle groups');

    const equipLabel = equipment
      .filter((e) => e.isRequired)
      .map((e) => e.equipment.toLowerCase().replace('_', ' '))
      .join(' and ');

    const using = equipLabel ? ` using ${equipLabel}` : '';
    return `${name} is an exercise targeting the ${muscleLabel}${using}.`;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private getFuzzyThreshold(query: string): number {
    const length = query.trim().length;

    if (length <= 3) {
      return 0.1;
    }

    if (length <= 6) {
      return 0.2;
    }

    return 0.25;
  }
}
