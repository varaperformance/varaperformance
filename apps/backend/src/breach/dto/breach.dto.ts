import {
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { BreachSeverity, BreachStatus } from '@generated/prisma';

export class RecordBreachDto {
  @IsEnum(BreachSeverity)
  severity: BreachSeverity;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  dataCategories: string[];

  @IsISO8601()
  detectedAt: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  affectedCount?: number;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class UpdateBreachDto {
  @IsOptional()
  @IsEnum(BreachStatus)
  status?: BreachStatus;

  @IsOptional()
  @IsString()
  internalNotes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  affectedCount?: number;

  @IsOptional()
  @IsISO8601()
  containedAt?: string;

  @IsOptional()
  @IsString()
  dpaReference?: string;
}
