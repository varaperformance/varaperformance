import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type {
  SuccessResponse,
  ErrorResponse,
  PaginatedResponse,
  CreateRecipeCategory,
  UpdateRecipeCategory,
  RecipeCategoryQuery,
  RecipeCategoryListItem,
} from '@varaperformance/core';
import {
  recipeCategoryListSelect,
  recipeCategorySelect,
} from './selectors/recipe-category.selector';

@Injectable()
export class RecipeCategoriesService {
  constructor(private readonly db: DatabaseService) {}

  async getCategories(
    query: RecipeCategoryQuery,
  ): Promise<PaginatedResponse<RecipeCategoryListItem>> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: NonNullable<
      Parameters<typeof this.db.recipeCategory.findMany>[0]
    >['where'] = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [categories, total] = await Promise.all([
      this.db.recipeCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sortOrder: 'asc' },
        select: recipeCategoryListSelect,
      }),
      this.db.recipeCategory.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: categories.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + categories.length < total,
      },
    };
  }

  async getCategory(
    id: string,
  ): Promise<SuccessResponse<Record<string, unknown>> | ErrorResponse> {
    const category = await this.db.recipeCategory.findUnique({
      where: { id },
      select: recipeCategorySelect,
    });

    if (!category) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recipe category not found' },
      };
    }

    return { success: true, data: category };
  }

  async createCategory(
    data: CreateRecipeCategory,
  ): Promise<SuccessResponse<Record<string, unknown>>> {
    const category = await this.db.recipeCategory.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        sortOrder: data.sortOrder ?? 0,
      },
      select: recipeCategorySelect,
    });

    return { success: true, data: category };
  }

  async updateCategory(
    id: string,
    data: UpdateRecipeCategory,
  ): Promise<SuccessResponse<Record<string, unknown>> | ErrorResponse> {
    const existing = await this.db.recipeCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recipe category not found' },
      };
    }

    const category = await this.db.recipeCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
      select: recipeCategorySelect,
    });

    return { success: true, data: category };
  }

  async deleteCategory(
    id: string,
  ): Promise<SuccessResponse<{ id: string }> | ErrorResponse> {
    const existing = await this.db.recipeCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recipe category not found' },
      };
    }

    await this.db.recipeCategory.delete({ where: { id } });
    return { success: true, data: { id } };
  }

  async checkSlug(
    slug: string,
    excludeId?: string,
  ): Promise<SuccessResponse<{ available: boolean }>> {
    const existing = await this.db.recipeCategory.findUnique({
      where: { slug },
      select: { id: true },
    });

    const available = !existing || existing.id === excludeId;
    return { success: true, data: { available } };
  }
}
