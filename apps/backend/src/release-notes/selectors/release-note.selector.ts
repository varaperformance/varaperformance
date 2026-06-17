// Release Note selector (admin)
export const releaseNoteSelector = {
  id: true,
  version: true,
  title: true,
  type: true,
  status: true,
  publishedAt: true,
  highlights: true,
  features: true,
  improvements: true,
  fixes: true,
  createdAt: true,
  updatedAt: true,
};
export type ReleaseNoteSelector = typeof releaseNoteSelector;

// Public release note selector
export const publicReleaseNoteSelector = {
  id: true,
  version: true,
  title: true,
  type: true,
  publishedAt: true,
  highlights: true,
  features: true,
  improvements: true,
  fixes: true,
};
export type PublicReleaseNoteSelector = typeof publicReleaseNoteSelector;
