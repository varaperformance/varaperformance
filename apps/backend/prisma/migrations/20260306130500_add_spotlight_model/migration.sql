-- CreateTable
CREATE TABLE "Spotlight" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT,
    "imageUrl" TEXT NOT NULL,
    "videoUrl" TEXT,
    "tagline" VARCHAR(280) NOT NULL,
    "story" TEXT NOT NULL,
    "achievements" TEXT[],
    "sport" TEXT NOT NULL,
    "memberSince" TIMESTAMP(3),
    "quote" TEXT,
    "twitterUrl" TEXT,
    "instagramUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "Published" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spotlight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Spotlight_slug_key" ON "Spotlight"("slug");

-- CreateIndex
CREATE INDEX "Spotlight_slug_idx" ON "Spotlight"("slug");

-- CreateIndex
CREATE INDEX "Spotlight_status_isActive_featured_idx" ON "Spotlight"("status", "isActive", "featured");

-- CreateIndex
CREATE INDEX "Spotlight_publishedAt_idx" ON "Spotlight"("publishedAt");
