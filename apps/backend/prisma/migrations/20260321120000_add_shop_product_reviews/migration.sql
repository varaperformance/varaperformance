-- CreateTable
CREATE TABLE "ShopProductReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopProductReview_productId_userId_key" ON "ShopProductReview"("productId", "userId");

-- CreateIndex
CREATE INDEX "ShopProductReview_productId_createdAt_idx" ON "ShopProductReview"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "ShopProductReview_rating_idx" ON "ShopProductReview"("rating");

-- AddForeignKey
ALTER TABLE "ShopProductReview" ADD CONSTRAINT "ShopProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopProductReview" ADD CONSTRAINT "ShopProductReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
