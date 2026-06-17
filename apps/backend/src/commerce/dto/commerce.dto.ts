import { createZodDto } from 'nestjs-zod';
import {
  AdjustInventorySchema,
  AdminPaginationQuerySchema,
  BrandIdParamsSchema,
  CatalogQuerySchema,
  CreateBrandSchema,
  CreateCheckoutSessionSchema,
  CreateDiscountCodeSchema,
  CreateProductReviewSchema,
  CreateProductSchema,
  CreateReferralCodeSchema,
  DiscountCodeIdParamSchema,
  OptionIdParamsSchema,
  ProductIdParamsSchema,
  ProductOptionInputSchema,
  ProductSlugParamsSchema,
  UpdateBrandSchema,
  UpdateDiscountCodeSchema,
  UpdateProductSchema,
} from '@varaperformance/core';

export class CatalogQueryDto extends createZodDto(CatalogQuerySchema) {}

export class ProductIdParamsDto extends createZodDto(ProductIdParamsSchema) {}

export class CreateCheckoutSessionDto extends createZodDto(
  CreateCheckoutSessionSchema,
) {}

export class AdminPaginationQueryDto extends createZodDto(
  AdminPaginationQuerySchema,
) {}

export class CreateProductDto extends createZodDto(CreateProductSchema) {}
export class UpdateProductDto extends createZodDto(UpdateProductSchema) {}

export class ProductIdParamDto extends createZodDto(ProductIdParamsSchema) {}

export class ProductSlugParamDto extends createZodDto(
  ProductSlugParamsSchema,
) {}

export class AdjustInventoryDto extends createZodDto(AdjustInventorySchema) {}

export class DiscountCodeIdParamDto extends createZodDto(
  DiscountCodeIdParamSchema,
) {}

export class CreateDiscountCodeDto extends createZodDto(
  CreateDiscountCodeSchema,
) {}
export class UpdateDiscountCodeDto extends createZodDto(
  UpdateDiscountCodeSchema,
) {}

export class CreateReferralCodeDto extends createZodDto(
  CreateReferralCodeSchema,
) {}

export class CreateProductReviewDto extends createZodDto(
  CreateProductReviewSchema,
) {}

export class CreateBrandDto extends createZodDto(CreateBrandSchema) {}
export class UpdateBrandDto extends createZodDto(UpdateBrandSchema) {}
export class BrandIdParamDto extends createZodDto(BrandIdParamsSchema) {}

export class OptionIdParamDto extends createZodDto(OptionIdParamsSchema) {}
export class ProductOptionInputDto extends createZodDto(
  ProductOptionInputSchema,
) {}
