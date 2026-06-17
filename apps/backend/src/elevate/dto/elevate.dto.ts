import { createZodDto } from 'nestjs-zod';
import {
  CreateElevatePostSchema,
  UpdateElevatePostSchema,
  CreateElevateCommentSchema,
  UpdateElevateCommentSchema,
  ElevateFeedQuerySchema,
  ElevatePostIdSchema,
  ElevateCommentIdSchema,
  CreateElevateReportSchema,
  UpdateElevateReportSchema,
  AdminElevateReportsQuerySchema,
  CreateElevateStorySchema,
  SendGymPartnerRequestSchema,
  RespondGymPartnerRequestSchema,
  GymPartnersQuerySchema,
  ElevateFeedQueryExtendedSchema,
  SearchUsersQuerySchema,
} from '@varaperformance/core';

export class CreateElevatePostDto extends createZodDto(
  CreateElevatePostSchema,
) {}

export class UpdateElevatePostDto extends createZodDto(
  UpdateElevatePostSchema,
) {}

export class CreateElevateCommentDto extends createZodDto(
  CreateElevateCommentSchema,
) {}

export class UpdateElevateCommentDto extends createZodDto(
  UpdateElevateCommentSchema,
) {}

export class ElevateFeedQueryDto extends createZodDto(ElevateFeedQuerySchema) {}

export class ElevatePostIdDto extends createZodDto(ElevatePostIdSchema) {}

export class ElevateCommentIdDto extends createZodDto(ElevateCommentIdSchema) {}

export class CreateElevateReportDto extends createZodDto(
  CreateElevateReportSchema,
) {}

export class UpdateElevateReportDto extends createZodDto(
  UpdateElevateReportSchema,
) {}

export class AdminElevateReportsQueryDto extends createZodDto(
  AdminElevateReportsQuerySchema,
) {}

export class CreateElevateStoryDto extends createZodDto(
  CreateElevateStorySchema,
) {}

// Gym Partners
export class SendGymPartnerRequestDto extends createZodDto(
  SendGymPartnerRequestSchema,
) {}

export class RespondGymPartnerRequestDto extends createZodDto(
  RespondGymPartnerRequestSchema,
) {}

export class GymPartnersQueryDto extends createZodDto(GymPartnersQuerySchema) {}

export class ElevateFeedQueryExtendedDto extends createZodDto(
  ElevateFeedQueryExtendedSchema,
) {}

export class SearchUsersQueryDto extends createZodDto(SearchUsersQuerySchema) {}
