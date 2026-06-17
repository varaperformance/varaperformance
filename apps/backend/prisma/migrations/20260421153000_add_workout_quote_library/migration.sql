-- CreateTable
CREATE TABLE "WorkoutQuote" (
    "id" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ai',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkoutQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutQuote_hash_key" ON "WorkoutQuote"("hash");

-- CreateIndex
CREATE INDEX "WorkoutQuote_author_idx" ON "WorkoutQuote"("author");
