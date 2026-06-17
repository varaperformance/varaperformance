import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type {
  SuccessResponse,
  ErrorResponse,
  PaginatedResponse,
  CreateTag,
  UpdateTag,
  TagQuery,
} from '@varaperformance/core';
import {
  tagWithCountSelector,
  tagSelector,
  type TagWithCountSelect,
  type TagSelect,
} from './selectors/tag.selector';

@Injectable()
export class TagsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Get all tags with pagination and search
   */
  async getTags(
    query: TagQuery,
  ): Promise<PaginatedResponse<TagWithCountSelect>> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: NonNullable<
      Parameters<typeof this.db.tag.findMany>[0]
    >['where'] = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tags, total] = await Promise.all([
      this.db.tag.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: tagWithCountSelector,
      }),
      this.db.tag.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: tags,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + tags.length < total,
      },
    };
  }

  /**
   * Get a single tag by ID
   */
  async getTag(
    id: string,
  ): Promise<SuccessResponse<TagSelect> | ErrorResponse> {
    const tag = await this.db.tag.findUnique({
      where: { id },
      select: tagSelector,
    });

    if (!tag) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tag not found' },
      };
    }

    return { success: true, data: tag };
  }

  /**
   * Create a new tag
   */
  async createTag(data: CreateTag): Promise<SuccessResponse<TagSelect>> {
    const tag = await this.db.tag.create({
      data: {
        name: data.name,
        slug: data.slug,
      },
      select: tagSelector,
    });

    return { success: true, data: tag };
  }

  /**
   * Update a tag
   */
  async updateTag(
    id: string,
    data: UpdateTag,
  ): Promise<SuccessResponse<TagSelect> | ErrorResponse> {
    // Check if tag exists
    const existing = await this.db.tag.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tag not found' },
      };
    }

    const tag = await this.db.tag.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
      },
      select: tagSelector,
    });

    return { success: true, data: tag };
  }

  /**
   * Delete a tag
   */
  async deleteTag(
    id: string,
  ): Promise<SuccessResponse<{ id: string }> | ErrorResponse> {
    // Check if tag exists
    const existing = await this.db.tag.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tag not found' },
      };
    }

    await this.db.tag.delete({ where: { id } });

    return { success: true, data: { id } };
  }

  /**
   * Check if a slug is available
   */
  async checkSlug(
    slug: string,
    excludeId?: string,
  ): Promise<SuccessResponse<{ available: boolean }>> {
    const existing = await this.db.tag.findUnique({
      where: { slug },
      select: { id: true },
    });

    const available = !existing || existing.id === excludeId;

    return { success: true, data: { available } };
  }
}
