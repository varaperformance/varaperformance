import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type { SuccessResponse, PaginatedResponse } from '@varaperformance/core';
import {
  CreateReleaseNoteDto,
  UpdateReleaseNoteDto,
  ReleaseNoteQueryDto,
} from './dto/release-note.dto';
import {
  releaseNoteSelector,
  publicReleaseNoteSelector,
} from './selectors/release-note.selector';

@Injectable()
export class ReleaseNotesService {
  constructor(private readonly db: DatabaseService) {}

  // ==================== Public Operations ====================

  /**
   * Get all published release notes (public)
   */
  async getPublicReleaseNotes(): Promise<SuccessResponse<any>> {
    const releases = await this.db.releaseNote.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      select: publicReleaseNoteSelector,
    });

    return { success: true, data: releases };
  }

  /**
   * Get the latest published release note
   */
  async getLatestRelease(): Promise<SuccessResponse<any>> {
    const release = await this.db.releaseNote.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      select: publicReleaseNoteSelector,
    });

    if (!release) {
      throw new NotFoundException('No published release notes found');
    }

    return { success: true, data: release };
  }

  // ==================== Admin Operations ====================

  /**
   * Get release notes with pagination (admin)
   */
  async getReleaseNotes(
    query: ReleaseNoteQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20, search, type, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { version: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    const [releases, total] = await Promise.all([
      this.db.releaseNote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: releaseNoteSelector,
      }),
      this.db.releaseNote.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: releases,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + releases.length < total,
      },
    };
  }

  /**
   * Get a single release note (admin)
   */
  async getReleaseNote(id: string): Promise<SuccessResponse<any>> {
    const release = await this.db.releaseNote.findUnique({
      where: { id },
      select: releaseNoteSelector,
    });

    if (!release) {
      throw new NotFoundException('Release note not found');
    }

    return { success: true, data: release };
  }

  /**
   * Create a release note
   */
  async createReleaseNote(
    data: CreateReleaseNoteDto,
  ): Promise<SuccessResponse<any>> {
    const release = await this.db.releaseNote.create({
      data: {
        version: data.version,
        title: data.title,
        type: data.type ?? 'MINOR',
        status: data.status ?? 'DRAFT',
        publishedAt: data.publishedAt,
        highlights: data.highlights ?? [],
        features: data.features ?? [],
        improvements: data.improvements ?? [],
        fixes: data.fixes ?? [],
      },
      select: releaseNoteSelector,
    });

    return { success: true, data: release };
  }

  /**
   * Update a release note
   */
  async updateReleaseNote(
    id: string,
    data: UpdateReleaseNoteDto,
  ): Promise<SuccessResponse<any>> {
    const release = await this.db.releaseNote.update({
      where: { id },
      data,
      select: releaseNoteSelector,
    });

    return { success: true, data: release };
  }

  /**
   * Delete a release note
   */
  async deleteReleaseNote(id: string): Promise<SuccessResponse<any>> {
    await this.db.releaseNote.delete({
      where: { id },
    });

    return { success: true, data: { deleted: true } };
  }
}
