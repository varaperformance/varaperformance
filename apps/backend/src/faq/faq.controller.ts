import {
  Controller,
  Get,
  Header,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { FaqService } from './faq.service';
import { Public } from 'src/idm/decorators/public.decorator';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { SkipAudit } from '@app/common/audit';
import {
  CreateFaqCategoryDto,
  UpdateFaqCategoryDto,
  FaqCategoryQueryDto,
  CreateFaqDto,
  UpdateFaqDto,
  FaqQueryDto,
} from './dto/faq.dto';

@ApiTags('faqs')
@Controller({
  version: '1',
  path: 'faqs',
})
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  // ==================== Public Endpoints ====================

  @ApiOperation({ summary: 'Get all public FAQs grouped by category' })
  @ApiOkResponse({ description: 'List of FAQ categories with FAQs' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('public')
  getPublicFaqs() {
    return this.faqService.getPublicFaqs();
  }

  @ApiOperation({ summary: 'Get featured FAQs' })
  @ApiOkResponse({ description: 'List of featured FAQs' })
  @Public()
  @SkipAudit()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('featured')
  getFeaturedFaqs() {
    return this.faqService.getFeaturedFaqs();
  }

  @ApiOperation({ summary: 'Increment FAQ view count' })
  @ApiOkResponse({ description: 'Updated view count' })
  @Public()
  @SkipAudit()
  @Post(':id/view')
  incrementViewCount(@Param('id') id: string) {
    return this.faqService.incrementViewCount(id);
  }

  // ==================== FAQ Category Admin Endpoints ====================

  @ApiOperation({ summary: 'Get FAQ categories (admin)' })
  @ApiOkResponse({ description: 'Paginated FAQ categories' })
  @Permissions('faq:read')
  @Get('categories')
  getCategories(@Query() query: FaqCategoryQueryDto) {
    return this.faqService.getCategories(query);
  }

  @ApiOperation({ summary: 'Get a single FAQ category' })
  @ApiOkResponse({ description: 'FAQ category details' })
  @Permissions('faq:read')
  @Get('categories/:id')
  getCategory(@Param('id') id: string) {
    return this.faqService.getCategory(id);
  }

  @ApiOperation({ summary: 'Create FAQ category' })
  @ApiOkResponse({ description: 'FAQ category created' })
  @Permissions('faq:create')
  @Post('categories')
  createCategory(@Body() data: CreateFaqCategoryDto) {
    return this.faqService.createCategory(data);
  }

  @ApiOperation({ summary: 'Update FAQ category' })
  @ApiOkResponse({ description: 'FAQ category updated' })
  @Permissions('faq:update')
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() data: UpdateFaqCategoryDto) {
    return this.faqService.updateCategory(id, data);
  }

  @ApiOperation({ summary: 'Delete FAQ category' })
  @ApiOkResponse({ description: 'FAQ category deleted' })
  @Permissions('faq:delete')
  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.faqService.deleteCategory(id);
  }

  // ==================== FAQ Admin Endpoints ====================

  @ApiOperation({ summary: 'Get FAQs (admin)' })
  @ApiOkResponse({ description: 'Paginated FAQs' })
  @Permissions('faq:read')
  @Get()
  getFaqs(@Query() query: FaqQueryDto) {
    return this.faqService.getFaqs(query);
  }

  @ApiOperation({ summary: 'Get a single FAQ' })
  @ApiOkResponse({ description: 'FAQ details' })
  @Permissions('faq:read')
  @Get(':id')
  getFaq(@Param('id') id: string) {
    return this.faqService.getFaq(id);
  }

  @ApiOperation({ summary: 'Create FAQ' })
  @ApiOkResponse({ description: 'FAQ created' })
  @Permissions('faq:create')
  @Post()
  createFaq(@Body() data: CreateFaqDto) {
    return this.faqService.createFaq(data);
  }

  @ApiOperation({ summary: 'Update FAQ' })
  @ApiOkResponse({ description: 'FAQ updated' })
  @Permissions('faq:update')
  @Patch(':id')
  updateFaq(@Param('id') id: string, @Body() data: UpdateFaqDto) {
    return this.faqService.updateFaq(id, data);
  }

  @ApiOperation({ summary: 'Delete FAQ' })
  @ApiOkResponse({ description: 'FAQ deleted' })
  @Permissions('faq:delete')
  @Delete(':id')
  deleteFaq(@Param('id') id: string) {
    return this.faqService.deleteFaq(id);
  }
}
