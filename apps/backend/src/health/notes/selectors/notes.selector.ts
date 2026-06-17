/**
 * Prisma select for notes
 * Includes encryption fields needed for decryption but excludes them from response
 */
export const noteSelect = {
  id: true,
  userId: true,
  encryptedData: true,
  dataIv: true,
  dataAuthTag: true,
  wrappedKey: true,
  createdAt: true,
  updatedAt: true,
};
export type NoteSelect = typeof noteSelect;
