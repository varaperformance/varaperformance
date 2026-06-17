import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * GDPR Art. 17: Account deletion requires explicit confirmation.
 */
export const DeleteAccountSchema = z.object({
  confirmation: z
    .literal('DELETE MY ACCOUNT')
    .describe('Must be the exact string "DELETE MY ACCOUNT" to confirm'),
});

export class DeleteAccountDto extends createZodDto(DeleteAccountSchema) {}
