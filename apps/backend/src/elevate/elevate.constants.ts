export const REPORT_THRESHOLD = Number(
  process.env.ELEVATE_REPORT_THRESHOLD ?? '5',
);

export const POST_COOLDOWN_SECONDS = Number(
  process.env.ELEVATE_POST_COOLDOWN_SECONDS ?? '20',
);

export const COMMENT_COOLDOWN_SECONDS = Number(
  process.env.ELEVATE_COMMENT_COOLDOWN_SECONDS ?? '8',
);

export const DUPLICATE_WINDOW_MINUTES = Number(
  process.env.ELEVATE_DUPLICATE_WINDOW_MINUTES ?? '15',
);

export const MAX_POST_URLS = Number(process.env.ELEVATE_MAX_POST_URLS ?? '5');
export const MAX_COMMENT_URLS = Number(
  process.env.ELEVATE_MAX_COMMENT_URLS ?? '3',
);

const URL_REGEX = /https?:\/\/[^\s]+/gi;

export const normalizeSpamText = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

export const countUrls = (value: string): number => {
  const matches = value.match(URL_REGEX);
  return matches?.length ?? 0;
};
