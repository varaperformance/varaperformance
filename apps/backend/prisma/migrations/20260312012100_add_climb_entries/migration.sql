-- CreateTable
CREATE TABLE "ClimbEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "note" VARCHAR(280),
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClimbEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClimbEntry_userId_idx" ON "ClimbEntry"("userId");

-- CreateIndex
CREATE INDEX "ClimbEntry_userId_capturedDate_idx" ON "ClimbEntry"("userId", "capturedDate");

-- CreateIndex
CREATE UNIQUE INDEX "ClimbEntry_userId_capturedDate_key" ON "ClimbEntry"("userId", "capturedDate");

-- AddForeignKey
ALTER TABLE "ClimbEntry" ADD CONSTRAINT "ClimbEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
