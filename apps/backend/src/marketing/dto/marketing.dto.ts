import { createZodDto } from 'nestjs-zod';
import {
  CreateNewsletterSchema,
  UpdateNewsletterSchema,
  NewsletterQuerySchema,
  SubscriberQuerySchema,
} from '@varaperformance/core';

export class CreateNewsletterDto extends createZodDto(CreateNewsletterSchema) {}
export class UpdateNewsletterDto extends createZodDto(UpdateNewsletterSchema) {}
export class NewsletterQueryDto extends createZodDto(NewsletterQuerySchema) {}
export class SubscriberQueryDto extends createZodDto(SubscriberQuerySchema) {}
