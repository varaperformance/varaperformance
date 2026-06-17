-- CreateEnum
CREATE TYPE "StoryMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "ElevateStory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mediaType" "StoryMediaType" NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "thumbnail" TEXT,
    "duration" INTEGER,
    "caption" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElevateStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElevateStoryView" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElevateStoryView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ElevateStory_userId_idx" ON "ElevateStory"("userId");

-- CreateIndex
CREATE INDEX "ElevateStory_expiresAt_idx" ON "ElevateStory"("expiresAt");

-- CreateIndex
CREATE INDEX "ElevateStory_createdAt_idx" ON "ElevateStory"("createdAt");

-- CreateIndex
CREATE INDEX "ElevateStoryView_storyId_idx" ON "ElevateStoryView"("storyId");

-- CreateIndex
CREATE INDEX "ElevateStoryView_userId_idx" ON "ElevateStoryView"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ElevateStoryView_storyId_userId_key" ON "ElevateStoryView"("storyId", "userId");

-- AddForeignKey
ALTER TABLE "ElevateStory" ADD CONSTRAINT "ElevateStory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElevateStoryView" ADD CONSTRAINT "ElevateStoryView_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "ElevateStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElevateStoryView" ADD CONSTRAINT "ElevateStoryView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
