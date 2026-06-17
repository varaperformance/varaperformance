import { z } from 'zod';

// Note data (decrypted structure)
export const NoteDataSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string(),
});

// Create note - client sends plaintext, server encrypts
export const CreateNoteSchema = NoteDataSchema;

// Update note - partial update
export const UpdateNoteSchema = NoteDataSchema.partial();

// Note params
export const NoteParamsSchema = z.object({
  id: z.uuid(),
});

// Note query for listing
export const NoteQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Inferred types
export type NoteData = z.infer<typeof NoteDataSchema>;
export type CreateNote = z.infer<typeof CreateNoteSchema>;
export type UpdateNote = z.infer<typeof UpdateNoteSchema>;
export type NoteParams = z.infer<typeof NoteParamsSchema>;
export type NoteQuery = z.infer<typeof NoteQuerySchema>;
// Note: NoteResponse and NotesListData are in interfaces/notes.interface.ts
