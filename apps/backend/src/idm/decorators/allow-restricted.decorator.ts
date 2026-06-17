import { SetMetadata } from '@nestjs/common';

export const ALLOW_RESTRICTED_KEY = 'allowRestricted';
export const AllowRestricted = () => SetMetadata(ALLOW_RESTRICTED_KEY, true);
