-- CreateTable
CREATE TABLE "ShopCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopCategory_slug_key" ON "ShopCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCategory_name_key" ON "ShopCategory"("name");

-- CreateIndex
CREATE INDEX "ShopCategory_isActive_sortOrder_idx" ON "ShopCategory"("isActive", "sortOrder");

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

-- Backfill categories from existing product category text.
INSERT INTO "ShopCategory" ("id", "name", "slug", "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  source."category",
  lower(regexp_replace(source."category", '[^a-zA-Z0-9]+', '-', 'g')),
  true,
  0,
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT "category"
  FROM "Product"
  WHERE "category" IS NOT NULL AND btrim("category") <> ''
) AS source
ON CONFLICT ("name") DO NOTHING;

-- Map products to the corresponding inserted category.
UPDATE "Product" p
SET "categoryId" = sc."id"
FROM "ShopCategory" sc
WHERE sc."name" = p."category";

-- Safety fallback if legacy category values were empty/invalid.
INSERT INTO "ShopCategory" ("id", "name", "slug", "isActive", "sortOrder", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'Uncategorized',
  'uncategorized',
  true,
  999,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM "Product" WHERE "categoryId" IS NULL)
ON CONFLICT ("name") DO NOTHING;

UPDATE "Product"
SET "categoryId" = (SELECT "id" FROM "ShopCategory" WHERE "slug" = 'uncategorized')
WHERE "categoryId" IS NULL;

-- Enforce required relation and clean up old free-text category.
ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Product" DROP COLUMN "category";

-- Replace legacy category index.
DROP INDEX IF EXISTS "Product_category_isActive_idx";
CREATE INDEX "Product_categoryId_isActive_idx" ON "Product"("categoryId", "isActive");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ShopCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
