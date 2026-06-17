-- AlterTable
ALTER TABLE "ShopCategory" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "ShopCategory_parentId_idx" ON "ShopCategory"("parentId");

-- AddForeignKey
ALTER TABLE "ShopCategory" ADD CONSTRAINT "ShopCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ShopCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
