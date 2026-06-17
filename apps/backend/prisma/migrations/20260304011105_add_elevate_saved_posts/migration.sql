-- CreateTable
CREATE TABLE "ElevateSavedPost" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElevateSavedPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ElevateSavedPost_userId_idx" ON "ElevateSavedPost"("userId");

-- CreateIndex
CREATE INDEX "ElevateSavedPost_postId_idx" ON "ElevateSavedPost"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "ElevateSavedPost_postId_userId_key" ON "ElevateSavedPost"("postId", "userId");

-- AddForeignKey
ALTER TABLE "ElevateSavedPost" ADD CONSTRAINT "ElevateSavedPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ElevatePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElevateSavedPost" ADD CONSTRAINT "ElevateSavedPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
