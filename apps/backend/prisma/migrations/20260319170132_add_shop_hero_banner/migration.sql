-- CreateTable
CREATE TABLE "ShopHeroBanner" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT NOT NULL,
    "alt" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopHeroBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopHeroBanner_isActive_sortOrder_idx" ON "ShopHeroBanner"("isActive", "sortOrder");
