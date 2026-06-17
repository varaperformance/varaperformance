import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { StorageService } from '@app/common/storage';
import { Public } from 'src/idm/decorators/public.decorator';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { ActiveUser } from 'src/idm/decorators/active-user.decorator';
import {
  AdjustInventoryDto,
  AdminPaginationQueryDto,
  BrandIdParamDto,
  CatalogQueryDto,
  CreateBrandDto,
  CreateCheckoutSessionDto,
  CreateDiscountCodeDto,
  CreateProductDto,
  CreateProductReviewDto,
  CreateReferralCodeDto,
  DiscountCodeIdParamDto,
  ProductIdParamDto,
  ProductIdParamsDto,
  ProductOptionInputDto,
  ProductSlugParamDto,
  UpdateBrandDto,
  UpdateDiscountCodeDto,
  UpdateProductDto,
} from './dto/commerce.dto';
import { CommerceService } from './commerce.service';

@ApiTags('commerce')
@Controller({
  version: '1',
  path: 'commerce',
})
export class CommerceController {
  constructor(
    private readonly commerceService: CommerceService,
    private readonly storageService: StorageService,
  ) {}

  @ApiOperation({ summary: 'Admin upload product image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Post('admin/catalog/upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadProductImage(
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: JPEG, PNG, WebP',
      );
    }

    const uploaded = await this.storageService.uploadBuffer({
      folder: 'shop/products',
      originalName: file.originalname,
      contentType: file.mimetype,
      body: file.buffer,
      allowedMimeTypes,
    });

    return {
      success: true,
      data: { url: uploaded.url },
      message: 'Product image uploaded',
    };
  }

  @ApiOperation({ summary: 'Get public shop catalog' })
  @ApiOkResponse({ description: 'Catalog products' })
  @Public()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('catalog')
  getCatalog(@Query() query: CatalogQueryDto) {
    return this.commerceService.getCatalog(query);
  }

  @ApiOperation({ summary: 'Get active shop categories' })
  @Public()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('categories')
  listShopCategoriesPublic() {
    return this.commerceService.listShopCategories();
  }

  @ApiOperation({ summary: 'Get product details by slug' })
  @ApiOkResponse({ description: 'Single product by slug' })
  @Public()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('products/by-slug/:slug')
  getProductBySlug(@Param() params: ProductSlugParamDto) {
    return this.commerceService.getProductBySlug(params.slug);
  }

  @ApiOperation({ summary: 'Get product details' })
  @ApiOkResponse({ description: 'Single product' })
  @Public()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('products/:productId')
  getProduct(@Param() params: ProductIdParamsDto) {
    return this.commerceService.getProduct(params.productId);
  }

  @ApiOperation({ summary: 'Get product reviews' })
  @ApiOkResponse({ description: 'Product reviews with pagination' })
  @Public()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('products/:productId/reviews')
  getProductReviews(
    @Param() params: ProductIdParamsDto,
    @Query() query: AdminPaginationQueryDto,
  ) {
    return this.commerceService.getProductReviews(
      params.productId,
      query.page,
      query.limit,
    );
  }

  @ApiOperation({ summary: 'Create or update my review for a product' })
  @ApiBearerAuth()
  @Post('products/:productId/reviews')
  createProductReview(
    @ActiveUser('sub') userId: string,
    @Param() params: ProductIdParamsDto,
    @Body() dto: CreateProductReviewDto,
  ) {
    return this.commerceService.createProductReview(
      userId,
      params.productId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Moderator: update a product review' })
  @ApiBearerAuth()
  @Permissions('shop:review-moderate')
  @Patch('reviews/:reviewId')
  updateProductReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: { rating?: number; title?: string; content?: string },
  ) {
    return this.commerceService.updateProductReview(reviewId, dto);
  }

  @ApiOperation({ summary: 'Moderator: delete a product review' })
  @ApiBearerAuth()
  @Permissions('shop:review-moderate')
  @Delete('reviews/:reviewId')
  deleteProductReview(@Param('reviewId') reviewId: string) {
    return this.commerceService.deleteProductReview(reviewId);
  }

  @ApiOperation({ summary: 'Get active public promotions' })
  @Public()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('promotions/active')
  getActivePromotions() {
    return this.commerceService.getActivePromotions();
  }

  @ApiOperation({ summary: 'Get public shop header settings' })
  @Public()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('settings/header')
  getShopHeaderSettings() {
    return this.commerceService.getShopHeaderSettings();
  }

  @ApiOperation({ summary: 'Update shop header settings (admin)' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Patch('admin/settings/header')
  updateShopHeaderSettings(
    @ActiveUser('sub') userId: string,
    @Body()
    body: {
      freeShippingMessage?: string;
      navLinks?: Array<{ label: string; to: string; hasDropdown?: boolean }>;
    },
  ) {
    return this.commerceService.updateShopHeaderSettings(body, userId);
  }

  @ApiOperation({ summary: 'Get shop header settings (admin)' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-read')
  @Get('admin/settings/header')
  getShopHeaderSettingsAdmin() {
    return this.commerceService.getShopHeaderSettings();
  }

  @ApiOperation({ summary: 'Create Stripe checkout session for shop order' })
  @ApiOkResponse({ description: 'Hosted checkout URL' })
  @Public()
  @Post('checkout/session')
  createCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    return this.commerceService.createCheckoutSession(dto);
  }

  @ApiOperation({ summary: 'Create authenticated Stripe checkout session' })
  @ApiOkResponse({ description: 'Hosted checkout URL with linked user' })
  @ApiBearerAuth()
  @Post('checkout/session/auth')
  createAuthenticatedCheckoutSession(
    @ActiveUser('sub') userId: string,
    @ActiveUser('email') email: string,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.commerceService.createCheckoutSession(dto, {
      userId,
      emailOverride: email,
    });
  }

  @ApiOperation({ summary: 'List my shop orders' })
  @ApiBearerAuth()
  @Get('orders/my')
  listMyOrders(
    @ActiveUser('sub') userId: string,
    @ActiveUser('email') email: string,
    @Query() query: AdminPaginationQueryDto,
  ) {
    return this.commerceService.listMyOrders(
      userId,
      email,
      query.page,
      query.limit,
    );
  }

  @ApiOperation({ summary: 'Admin list catalog products' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-read')
  @Get('admin/catalog')
  listAdminCatalog() {
    return this.commerceService.listAdminCatalog();
  }

  @ApiOperation({ summary: 'Admin list shop categories' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-read')
  @Get('admin/categories')
  listAdminShopCategories() {
    return this.commerceService.listShopCategories({ includeInactive: true });
  }

  @ApiOperation({ summary: 'Admin create shop category' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Post('admin/categories')
  createAdminShopCategory(
    @Body()
    body: {
      name: string;
      slug?: string;
      parentId?: string;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.commerceService.createShopCategory(body);
  }

  @ApiOperation({ summary: 'Admin update shop category' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Patch('admin/categories/:categoryId')
  updateAdminShopCategory(
    @Param('categoryId') categoryId: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      parentId?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.commerceService.updateShopCategory(categoryId, body);
  }

  @ApiOperation({ summary: 'Admin delete shop category' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Delete('admin/categories/:categoryId')
  deleteAdminShopCategory(@Param('categoryId') categoryId: string) {
    return this.commerceService.deleteShopCategory(categoryId);
  }

  // ── Brands ───────────────────────────────────────────────

  @ApiOperation({ summary: 'Admin list brands' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-read')
  @Get('admin/brands')
  listBrands() {
    return this.commerceService.listBrands({ includeInactive: true });
  }

  @ApiOperation({ summary: 'Admin create brand' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Post('admin/brands')
  createBrand(@Body() dto: CreateBrandDto) {
    return this.commerceService.createBrand(dto);
  }

  @ApiOperation({ summary: 'Admin update brand' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Patch('admin/brands/:brandId')
  updateBrand(@Param() params: BrandIdParamDto, @Body() dto: UpdateBrandDto) {
    return this.commerceService.updateBrand(params.brandId, dto);
  }

  @ApiOperation({ summary: 'Admin delete brand' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Delete('admin/brands/:brandId')
  deleteBrand(@Param() params: BrandIdParamDto) {
    return this.commerceService.deleteBrand(params.brandId);
  }

  // ── Product Options ─────────────────────────────────────

  @ApiOperation({ summary: 'Admin add option axis to product' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Post('admin/catalog/:productId/options')
  addProductOption(
    @Param() params: ProductIdParamDto,
    @Body() dto: ProductOptionInputDto,
  ) {
    return this.commerceService.addProductOption(params.productId, dto);
  }

  @ApiOperation({ summary: 'Admin update product option' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Patch('admin/catalog/:productId/options/:optionId')
  updateProductOption(
    @Param('productId') productId: string,
    @Param('optionId') optionId: string,
    @Body() dto: ProductOptionInputDto,
  ) {
    return this.commerceService.updateProductOption(productId, optionId, dto);
  }

  @ApiOperation({ summary: 'Admin delete product option' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Delete('admin/catalog/:productId/options/:optionId')
  deleteProductOption(
    @Param('productId') productId: string,
    @Param('optionId') optionId: string,
  ) {
    return this.commerceService.deleteProductOption(productId, optionId);
  }

  @ApiOperation({ summary: 'Admin add option value' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Post('admin/catalog/:productId/options/:optionId/values')
  addProductOptionValue(
    @Param('productId') productId: string,
    @Param('optionId') optionId: string,
    @Body() body: { label: string; hexColor?: string; sortOrder?: number },
  ) {
    return this.commerceService.addProductOptionValue(
      productId,
      optionId,
      body,
    );
  }

  // ── Product CRUD ────────────────────────────────────────

  @ApiOperation({ summary: 'Admin create product' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Post('admin/catalog')
  createProduct(@Body() dto: CreateProductDto) {
    return this.commerceService.createProduct(dto);
  }

  @ApiOperation({ summary: 'Admin update product' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Patch('admin/catalog/:productId')
  updateProduct(
    @Param() params: ProductIdParamDto,
    @Body() dto: UpdateProductDto,
  ) {
    return this.commerceService.updateProduct(params.productId, dto);
  }

  @ApiOperation({ summary: 'Admin delete product' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Delete('admin/catalog/:productId')
  deleteProduct(@Param() params: ProductIdParamDto) {
    return this.commerceService.deleteProduct(params.productId);
  }

  @ApiOperation({ summary: 'Admin inventory view' })
  @ApiBearerAuth()
  @Permissions('shop:inventory-read')
  @Get('admin/inventory')
  getInventory(@Query() query: AdminPaginationQueryDto) {
    return this.commerceService.getInventory(query.search);
  }

  @ApiOperation({ summary: 'Admin adjust inventory' })
  @ApiBearerAuth()
  @Permissions('shop:inventory-update')
  @Post('admin/inventory/adjust')
  adjustInventory(
    @ActiveUser('sub') userId: string,
    @Body() dto: AdjustInventoryDto,
  ) {
    return this.commerceService.adjustInventory({ ...dto, userId });
  }

  @ApiOperation({ summary: 'Admin discount codes' })
  @ApiBearerAuth()
  @Permissions('shop:discount-read')
  @Get('admin/discount-codes')
  listDiscountCodes() {
    return this.commerceService.listDiscountCodes();
  }

  @ApiOperation({ summary: 'Admin create discount code' })
  @ApiBearerAuth()
  @Permissions('shop:discount-update')
  @Post('admin/discount-codes')
  createDiscountCode(
    @ActiveUser('sub') userId: string,
    @Body() dto: CreateDiscountCodeDto,
  ) {
    return this.commerceService.createDiscountCode(dto, userId);
  }

  @ApiOperation({ summary: 'Admin update discount code' })
  @ApiBearerAuth()
  @Permissions('shop:discount-update')
  @Patch('admin/discount-codes/:discountCodeId')
  updateDiscountCode(
    @Param() params: DiscountCodeIdParamDto,
    @Body() dto: UpdateDiscountCodeDto,
  ) {
    return this.commerceService.updateDiscountCode(params.discountCodeId, dto);
  }

  @ApiOperation({ summary: 'Admin delete discount code' })
  @ApiBearerAuth()
  @Permissions('shop:discount-update')
  @Delete('admin/discount-codes/:discountCodeId')
  deleteDiscountCode(@Param() params: DiscountCodeIdParamDto) {
    return this.commerceService.deleteDiscountCode(params.discountCodeId);
  }

  @ApiOperation({ summary: 'Admin referral overview' })
  @ApiBearerAuth()
  @Permissions('shop:referral-read')
  @Get('admin/referrals')
  listReferrals() {
    return this.commerceService.listReferrals();
  }

  @ApiOperation({ summary: 'Admin create referral code' })
  @ApiBearerAuth()
  @Permissions('shop:referral-update')
  @Post('admin/referrals/codes')
  createReferralCode(@Body() dto: CreateReferralCodeDto) {
    return this.commerceService.createReferralCode(dto);
  }

  @ApiOperation({ summary: 'Admin delete referral code' })
  @ApiBearerAuth()
  @Permissions('shop:referral-update')
  @Delete('admin/referrals/codes/:referralCodeId')
  deleteReferralCode(@Param('referralCodeId') referralCodeId: string) {
    return this.commerceService.deleteReferralCode(referralCodeId);
  }

  @ApiOperation({ summary: 'Admin list orders' })
  @ApiBearerAuth()
  @Permissions('payment:read', 'shop:order-read')
  @Get('admin/orders')
  listOrders(@Query() query: AdminPaginationQueryDto) {
    return this.commerceService.listOrders(query.page, query.limit);
  }

  @ApiOperation({ summary: 'Admin shop order summary metrics' })
  @ApiBearerAuth()
  @Permissions('payment:read')
  @Get('admin/orders/summary')
  getOrderSummary() {
    return this.commerceService.getOrderSummary();
  }

  @ApiOperation({ summary: 'Admin cancel a pending shop order' })
  @ApiBearerAuth()
  @Permissions('payment:update')
  @Patch('admin/orders/:orderId/cancel')
  cancelOrder(
    @Param('orderId') orderId: string,
    @Body() body: { reason?: string },
  ) {
    return this.commerceService.cancelOrder(orderId, body.reason);
  }

  @ApiOperation({ summary: 'Admin refund a paid shop order' })
  @ApiBearerAuth()
  @Permissions('payment:update')
  @Post('admin/orders/:orderId/refund')
  refundOrder(
    @Param('orderId') orderId: string,
    @Body() body: { reason?: string },
  ) {
    return this.commerceService.refundOrder(orderId, body.reason);
  }

  @ApiOperation({
    summary: 'Admin update order fulfillment status and tracking',
  })
  @ApiBearerAuth()
  @Permissions('shop:order-read')
  @Patch('admin/orders/:orderId/fulfillment')
  updateOrderFulfillment(
    @Param('orderId') orderId: string,
    @Body()
    body: {
      fulfillmentStatus?: 'UNFULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED';
      trackingNumber?: string;
      carrier?: string;
      notes?: string;
    },
  ) {
    return this.commerceService.updateOrderFulfillment(orderId, body);
  }

  // ── Bundles ───────────────────────────────────────────────

  @ApiOperation({ summary: 'List active product bundles' })
  @Get('bundles')
  listBundles() {
    return this.commerceService.listBundles();
  }

  @ApiOperation({ summary: 'Get a single active bundle by slug' })
  @Get('bundles/:slug')
  getBundleBySlug(@Param('slug') slug: string) {
    return this.commerceService.getBundleBySlug(slug);
  }

  @ApiOperation({ summary: 'Admin list all bundles' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-read')
  @Get('admin/bundles')
  listAdminBundles() {
    return this.commerceService.listBundles({ includeInactive: true });
  }

  @ApiOperation({ summary: 'Admin create bundle' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Post('admin/bundles')
  createBundle(
    @Body()
    body: {
      name: string;
      slug?: string;
      description?: string;
      priceInCents: number;
      imageUrl?: string;
      isActive?: boolean;
      sortOrder?: number;
      items: Array<{
        productId: string;
        variantId?: string;
        quantity?: number;
      }>;
    },
  ) {
    return this.commerceService.createBundle(body);
  }

  @ApiOperation({ summary: 'Admin update bundle' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Patch('admin/bundles/:bundleId')
  updateBundle(
    @Param('bundleId') bundleId: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      description?: string;
      priceInCents?: number;
      imageUrl?: string | null;
      isActive?: boolean;
      sortOrder?: number;
      items?: Array<{
        productId: string;
        variantId?: string;
        quantity?: number;
      }>;
    },
  ) {
    return this.commerceService.updateBundle(bundleId, body);
  }

  @ApiOperation({ summary: 'Admin delete bundle' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Delete('admin/bundles/:bundleId')
  deleteBundle(@Param('bundleId') bundleId: string) {
    return this.commerceService.deleteBundle(bundleId);
  }

  // ── Hero Banners ────────────────────────────────────────────

  @ApiOperation({ summary: 'List active hero banners' })
  @Public()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('hero-banners')
  listHeroBanners() {
    return this.commerceService.listHeroBanners();
  }

  @ApiOperation({ summary: 'Admin list all hero banners' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-read')
  @Get('admin/hero-banners')
  listAdminHeroBanners() {
    return this.commerceService.listHeroBanners({ includeInactive: true });
  }

  @ApiOperation({ summary: 'Admin create hero banner' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Post('admin/hero-banners')
  createHeroBanner(
    @Body()
    body: {
      imageUrl: string;
      linkUrl: string;
      alt?: string;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.commerceService.createHeroBanner(body);
  }

  @ApiOperation({ summary: 'Admin update hero banner' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Patch('admin/hero-banners/:bannerId')
  updateHeroBanner(
    @Param('bannerId') bannerId: string,
    @Body()
    body: {
      imageUrl?: string;
      linkUrl?: string;
      alt?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.commerceService.updateHeroBanner(bannerId, body);
  }

  @ApiOperation({ summary: 'Admin delete hero banner' })
  @ApiBearerAuth()
  @Permissions('shop:catalog-update')
  @Delete('admin/hero-banners/:bannerId')
  deleteHeroBanner(@Param('bannerId') bannerId: string) {
    return this.commerceService.deleteHeroBanner(bannerId);
  }

  @ApiOperation({ summary: 'Admin list customers' })
  @ApiBearerAuth()
  @Permissions('payment:read', 'shop:customer-read')
  @Get('admin/customers')
  listCustomers(@Query() query: AdminPaginationQueryDto) {
    return this.commerceService.listCustomers(
      query.page,
      query.limit,
      query.search,
    );
  }
}
