export const climbEntrySelector = {
  id: true,
  category: true,
  imageUrl: true,
  note: true,
  capturedAt: true,
  capturedDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ClimbEntrySelector = typeof climbEntrySelector;
