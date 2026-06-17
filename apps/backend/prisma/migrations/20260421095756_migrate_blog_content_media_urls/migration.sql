-- Migrate S3 URLs embedded inside Blog.content markdown text.
-- The 20260416_migrate_media_urls migration handled Blog.coverImage but not
-- inline images inside the content body, e.g.:
--   ![alt](https://s3.varaperformance.com/varaperformance-uploads/blogs/uuid/image.jpg)
--
-- Uses regexp_replace with the 'g' (global) flag to replace all occurrences
-- per row. External URLs (unsplash, etc.) are left untouched because the
-- pattern is anchored to the s3.varaperformance.com host.
--
-- Idempotent: rows that have no s3.varaperformance.com URLs are not touched.

BEGIN;

UPDATE "Blog"
SET "content" = regexp_replace(
  "content",
  'https://s3\.varaperformance\.com/varaperformance-uploads/([^)"'' \t\n\r]+)',
  '/v1/media/file/\1',
  'g'
)
WHERE "content" LIKE '%https://s3.varaperformance.com/varaperformance-uploads/%';

COMMIT;
