import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type {
  SuccessResponse,
  ErrorResponse,
  PaginatedResponse,
  CreateCategory,
  UpdateCategory,
  CategoryQuery,
} from '@varaperformance/core';
import {
  categoryWithCountSelector,
  categorySelector,
  type CategoryWithCountSelect,
  type CategorySelect,
} from './selectors/category.selector';

@Injectable()
export class CategoriesService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Get all categories with pagination and search
   */
  async getCategories(
    query: CategoryQuery,
  ): Promise<PaginatedResponse<CategoryWithCountSelect>> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: NonNullable<
      Parameters<typeof this.db.category.findMany>[0]
    >['where'] = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [categories, total] = await Promise.all([
      this.db.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: categoryWithCountSelector,
      }),
      this.db.category.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: categories,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + categories.length < total,
      },
    };
  }

  /**
   * Get a single category by ID
   */
  async getCategory(
    id: string,
  ): Promise<SuccessResponse<CategorySelect> | ErrorResponse> {
    const category = await this.db.category.findUnique({
      where: { id },
      select: categorySelector,
    });

    if (!category) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Category not found' },
      };
    }

    return { success: true, data: category };
  }

  /**
   * Create a new category
   */
  async createCategory(
    data: CreateCategory,
  ): Promise<SuccessResponse<CategorySelect>> {
    const category = await this.db.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
      },
      select: categorySelector,
    });

    return { success: true, data: category };
  }

  /**
   * Update a category
   */
  async updateCategory(
    id: string,
    data: UpdateCategory,
  ): Promise<SuccessResponse<CategorySelect> | ErrorResponse> {
    // Check if category exists
    const existing = await this.db.category.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Category not found' },
      };
    }

    const category = await this.db.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
      },
      select: categorySelector,
    });

    return { success: true, data: category };
  }

  /**
   * Delete a category
   */
  async deleteCategory(
    id: string,
  ): Promise<SuccessResponse<{ id: string }> | ErrorResponse> {
    // Check if category exists
    const existing = await this.db.category.findUnique({ where: { id } });
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Category not found' },
      };
    }

    await this.db.category.delete({ where: { id } });

    return { success: true, data: { id } };
  }

  /**
   * Check if a slug is available
   */
  async checkSlug(
    slug: string,
    excludeId?: string,
  ): Promise<SuccessResponse<{ available: boolean }>> {
    const existing = await this.db.category.findUnique({
      where: { slug },
      select: { id: true },
    });

    const available = !existing || existing.id === excludeId;

    return { success: true, data: { available } };
  }
}
