-- AlterTable
ALTER TABLE "Spotlight"
ADD COLUMN "submitterUserId" TEXT,
ADD COLUMN "submitterEmail" TEXT,
ADD COLUMN "reviewNotes" TEXT;

-- CreateIndex
CREATE INDEX "Spotlight_submitterUserId_idx" ON "Spotlight"("submitterUserId");
