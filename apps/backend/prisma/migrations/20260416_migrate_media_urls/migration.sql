-- Migrate S3 URLs → proxy paths (/v1/media/file/<key>)
-- DB stores: https://s3.varaperformance.com/varaperformance-uploads/<key>
-- Target:    /v1/media/file/<key>
--
-- External URLs (unsplash, themealdb, exercisedb, etc.) are left untouched.
-- Already-converted proxy paths are skipped (idempotent).
--
-- Encrypted fields (ClimbEntry.imageUrl) are skipped — the DB stores
-- encrypted bytes, not a URL string. The S3 key inside the encrypted
-- payload is resolved to a proxy path at the controller level after
-- decryption.

-- S3 URL prefix to strip
-- replace() only matches exact prefix, so external URLs are never touched.

BEGIN;

-- Profile avatars
UPDATE "Profile"
SET "avatarUrl" = '/v1/media/file/' || substring("avatarUrl" from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
WHERE "avatarUrl" LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%';

-- Profile covers
UPDATE "Profile"
SET "coverUrl" = '/v1/media/file/' || substring("coverUrl" from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
WHERE "coverUrl" LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%';

-- Blog cover images (has mix of S3 and external Unsplash URLs)
UPDATE "Blog"
SET "coverImage" = '/v1/media/file/' || substring("coverImage" from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
WHERE "coverImage" LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%';

-- Elevate post images (String[] array column)
UPDATE "ElevatePost"
SET "images" = (
  SELECT array_agg(
    CASE
      WHEN img LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%'
        THEN '/v1/media/file/' || substring(img from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
      ELSE img
    END
  )
  FROM unnest("images") AS img
)
WHERE EXISTS (
  SELECT 1 FROM unnest("images") AS img
  WHERE img LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%'
);

-- Elevate stories
UPDATE "ElevateStory"
SET "mediaUrl" = '/v1/media/file/' || substring("mediaUrl" from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
WHERE "mediaUrl" LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%';

UPDATE "ElevateStory"
SET "thumbnail" = '/v1/media/file/' || substring("thumbnail" from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
WHERE "thumbnail" LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%';

-- Product images
UPDATE "ProductImage"
SET "url" = '/v1/media/file/' || substring("url" from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
WHERE "url" LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%';

-- Product bundles
UPDATE "ProductBundle"
SET "imageUrl" = '/v1/media/file/' || substring("imageUrl" from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
WHERE "imageUrl" LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%';

-- Shop hero banners
UPDATE "ShopHeroBanner"
SET "imageUrl" = '/v1/media/file/' || substring("imageUrl" from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
WHERE "imageUrl" LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%';

-- Spotlights
UPDATE "Spotlight"
SET "imageUrl" = '/v1/media/file/' || substring("imageUrl" from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
WHERE "imageUrl" LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%';

UPDATE "Spotlight"
SET "videoUrl" = '/v1/media/file/' || substring("videoUrl" from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
WHERE "videoUrl" LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%';

-- Exercises (only S3 URLs — external exercisedb URLs are untouched)
UPDATE "Exercise"
SET "videoUrl" = '/v1/media/file/' || substring("videoUrl" from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
WHERE "videoUrl" LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%';

UPDATE "Exercise"
SET "thumbnailUrl" = '/v1/media/file/' || substring("thumbnailUrl" from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
WHERE "thumbnailUrl" LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%';

-- Team members
UPDATE "TeamMember"
SET "photoUrl" = '/v1/media/file/' || substring("photoUrl" from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
WHERE "photoUrl" LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%';

-- Recipes (only S3 URLs — external themealdb URLs are untouched)
UPDATE "Recipe"
SET "imageUrl" = '/v1/media/file/' || substring("imageUrl" from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
WHERE "imageUrl" LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%';

-- Challenges
UPDATE "Challenge"
SET "coverImage" = '/v1/media/file/' || substring("coverImage" from 'https://s3\.varaperformance\.com/varaperformance-uploads/(.*)')
WHERE "coverImage" LIKE 'https://s3.varaperformance.com/varaperformance-uploads/%';

COMMIT;
