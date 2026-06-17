import { createZodDto } from 'nestjs-zod';
import { z } from 'zod/v3';

const ContactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

export class ContactDto extends createZodDto(ContactSchema) {}
