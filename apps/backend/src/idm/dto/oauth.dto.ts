import { createZodDto } from 'nestjs-zod';
import {
  GoogleLoginSchema,
  AppleLoginSchema,
  OAuthTotpVerifySchema,
} from '@varaperformance/core';

export class GoogleLoginDto extends createZodDto(GoogleLoginSchema) {}
export class AppleLoginDto extends createZodDto(AppleLoginSchema) {}
export class OAuthTotpVerifyDto extends createZodDto(OAuthTotpVerifySchema) {}
