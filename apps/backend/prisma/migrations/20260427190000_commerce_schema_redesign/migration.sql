-- AlterEnum: Add OZ and G to existing WeightUnit
ALTER TYPE "WeightUnit" ADD VALUE IF NOT EXISTS 'OZ' BEFORE 'LB';
ALTER TYPE "WeightUnit" ADD VALUE IF NOT EXISTS 'G' BEFORE 'KG';

-- CreateTable: Brand
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");
CREATE INDEX "Brand_isActive_idx" ON "Brand"("isActive");

-- CreateTable: ProductOption
CREATE TABLE "ProductOption" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProductOption_productId_sortOrder_idx" ON "ProductOption"("productId", "sortOrder");

-- CreateTable: ProductOptionValue
CREATE TABLE "ProductOptionValue" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "hexColor" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProductOptionValue_optionId_sortOrder_idx" ON "ProductOptionValue"("optionId", "sortOrder");

-- CreateTable: ProductVariantOptionValue (join table)
CREATE TABLE "ProductVariantOptionValue" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "optionValueId" TEXT NOT NULL,

    CONSTRAINT "ProductVariantOptionValue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProductVariantOptionValue_variantId_optionValueId_key" ON "ProductVariantOptionValue"("variantId", "optionValueId");
CREATE INDEX "ProductVariantOptionValue_optionValueId_idx" ON "ProductVariantOptionValue"("optionValueId");

-- CreateTable: VariantImage
CREATE TABLE "VariantImage" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VariantImage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VariantImage_variantId_sortOrder_idx" ON "VariantImage"("variantId", "sortOrder");

-- CreateTable: InventoryRecord
CREATE TABLE "InventoryRecord" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantityOnHand" INTEGER NOT NULL DEFAULT 0,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "reorderPoint" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryRecord_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InventoryRecord_variantId_key" ON "InventoryRecord"("variantId");
CREATE INDEX "InventoryRecord_quantityOnHand_idx" ON "InventoryRecord"("quantityOnHand");

-- AlterTable: Product — add optional brandId
ALTER TABLE "Product" ADD COLUMN "brandId" TEXT;
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- AlterTable: ProductVariant — add weight fields
ALTER TABLE "ProductVariant" ADD COLUMN "weight" DOUBLE PRECISION;
ALTER TABLE "ProductVariant" ADD COLUMN "weightUnit" "WeightUnit";

-- AlterTable: InventoryAdjustment — add inventoryRecordId and orderId
ALTER TABLE "InventoryAdjustment" ADD COLUMN "inventoryRecordId" TEXT;
ALTER TABLE "InventoryAdjustment" ADD COLUMN "orderId" TEXT;
CREATE INDEX "InventoryAdjustment_inventoryRecordId_idx" ON "InventoryAdjustment"("inventoryRecordId");

-- AlterTable: ProductBundleItem — add index on variantId
CREATE INDEX "ProductBundleItem_variantId_idx" ON "ProductBundleItem"("variantId");

-- AddForeignKey constraints
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductOption" ADD CONSTRAINT "ProductOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "ProductOptionValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductVariantOptionValue" ADD CONSTRAINT "ProductVariantOptionValue_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductVariantOptionValue" ADD CONSTRAINT "ProductVariantOptionValue_optionValueId_fkey" FOREIGN KEY ("optionValueId") REFERENCES "ProductOptionValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VariantImage" ADD CONSTRAINT "VariantImage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryRecord" ADD CONSTRAINT "InventoryRecord_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryAdjustment" ADD CONSTRAINT "InventoryAdjustment_inventoryRecordId_fkey" FOREIGN KEY ("inventoryRecordId") REFERENCES "InventoryRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductBundleItem" ADD CONSTRAINT "ProductBundleItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: Create InventoryRecord for every existing ProductVariant
INSERT INTO "InventoryRecord" ("id", "variantId", "quantityOnHand", "quantityReserved", "updatedAt")
SELECT
  gen_random_uuid(),
  pv."id",
  pv."inventoryQuantity",
  pv."reservedQuantity",
  NOW()
FROM "ProductVariant" pv
WHERE NOT EXISTS (
  SELECT 1 FROM "InventoryRecord" ir WHERE ir."variantId" = pv."id"
);

-- Backfill: Link existing InventoryAdjustments to their new InventoryRecord
UPDATE "InventoryAdjustment" ia
SET "inventoryRecordId" = ir."id"
FROM "InventoryRecord" ir
WHERE ia."variantId" = ir."variantId"
  AND ia."inventoryRecordId" IS NULL;
