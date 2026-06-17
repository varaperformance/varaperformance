import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type { SuccessResponse, PaginatedResponse } from '@varaperformance/core';
import {
  CreateFaqCategoryDto,
  UpdateFaqCategoryDto,
  FaqCategoryQueryDto,
  CreateFaqDto,
  UpdateFaqDto,
  FaqQueryDto,
} from './dto/faq.dto';
import {
  faqCategoryWithCountSelector,
  faqCategorySummarySelector,
  faqSelector,
  publicFaqSelector,
} from './selectors/faq.selector';

@Injectable()
export class FaqService {
  constructor(private readonly db: DatabaseService) {}

  // ==================== FAQ Category Operations ====================

  /**
   * Get FAQ categories with pagination
   */
  async getCategories(
    query: FaqCategoryQueryDto,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [categories, total] = await Promise.all([
      this.db.faqCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { order: 'asc' },
        select: faqCategoryWithCountSelector,
      }),
      this.db.faqCategory.count({ where }),
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
   * Get a single FAQ category
   */
  async getCategory(id: string): Promise<SuccessResponse<any>> {
    const category = await this.db.faqCategory.findUnique({
      where: { id },
      select: faqCategoryWithCountSelector,
    });

    if (!category) {
      throw new NotFoundException('FAQ category not found');
    }

    return { success: true, data: category };
  }

  /**
   * Create a FAQ category
   */
  async createCategory(
    data: CreateFaqCategoryDto,
  ): Promise<SuccessResponse<any>> {
    const category = await this.db.faqCategory.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        order: data.order ?? 0,
        isActive: data.isActive ?? true,
      },
      select: faqCategoryWithCountSelector,
    });

    return { success: true, data: category };
  }

  /**
   * Update a FAQ category
   */
  async updateCategory(
    id: string,
    data: UpdateFaqCategoryDto,
  ): Promise<SuccessResponse<any>> {
    const category = await this.db.faqCategory.update({
      where: { id },
      data,
      select: faqCategoryWithCountSelector,
    });

    return { success: true, data: category };
  }

  /**
   * Delete a FAQ category
   */
  async deleteCategory(id: string): Promise<SuccessResponse<any>> {
    await this.db.faqCategory.delete({
      where: { id },
    });

    return { success: true, data: { deleted: true } };
  }

  // ==================== FAQ Operations ====================

  /**
   * Get FAQs with pagination
   */
  async getFaqs(query: FaqQueryDto): Promise<PaginatedResponse<any>> {
    const {
      page = 1,
      limit = 20,
      search,
      categoryId,
      isActive,
      isFeatured,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { answer: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    const [faqs, total] = await Promise.all([
      this.db.faq.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ category: { order: 'asc' } }, { order: 'asc' }],
        select: faqSelector,
      }),
      this.db.faq.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: faqs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + faqs.length < total,
      },
    };
  }

  /**
   * Get a single FAQ
   */
  async getFaq(id: string): Promise<SuccessResponse<any>> {
    const faq = await this.db.faq.findUnique({
      where: { id },
      select: faqSelector,
    });

    if (!faq) {
      throw new NotFoundException('FAQ not found');
    }

    return { success: true, data: faq };
  }

  /**
   * Create a FAQ
   */
  async createFaq(data: CreateFaqDto): Promise<SuccessResponse<any>> {
    const faq = await this.db.faq.create({
      data: {
        question: data.question,
        answer: data.answer,
        categoryId: data.categoryId,
        order: data.order ?? 0,
        isActive: data.isActive ?? true,
        isFeatured: data.isFeatured ?? false,
      },
      select: faqSelector,
    });

    return { success: true, data: faq };
  }

  /**
   * Update a FAQ
   */
  async updateFaq(
    id: string,
    data: UpdateFaqDto,
  ): Promise<SuccessResponse<any>> {
    const faq = await this.db.faq.update({
      where: { id },
      data,
      select: faqSelector,
    });

    return { success: true, data: faq };
  }

  /**
   * Delete a FAQ
   */
  async deleteFaq(id: string): Promise<SuccessResponse<any>> {
    await this.db.faq.delete({
      where: { id },
    });

    return { success: true, data: { deleted: true } };
  }

  // ==================== Public FAQ Operations ====================

  /**
   * Get all public FAQs grouped by category
   */
  async getPublicFaqs(): Promise<SuccessResponse<any>> {
    const categories = await this.db.faqCategory.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        faqs: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          select: publicFaqSelector,
        },
      },
    });

    return {
      success: true,
      data: categories,
    };
  }

  /**
   * Get featured FAQs
   */
  async getFeaturedFaqs(): Promise<SuccessResponse<any>> {
    const faqs = await this.db.faq.findMany({
      where: {
        isActive: true,
        isFeatured: true,
      },
      orderBy: { order: 'asc' },
      select: {
        ...publicFaqSelector,
        category: {
          select: faqCategorySummarySelector,
        },
      },
    });

    return { success: true, data: faqs };
  }

  /**
   * Increment FAQ view count
   */
  async incrementViewCount(id: string): Promise<SuccessResponse<any>> {
    const faq = await this.db.faq.update({
      where: { id },
      data: {
        views: { increment: 1 },
      },
      select: {
        id: true,
        views: true,
      },
    });

    return { success: true, data: faq };
  }
}
