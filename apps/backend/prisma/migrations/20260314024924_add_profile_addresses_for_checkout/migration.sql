-- CreateTable
CREATE TABLE "ProfileAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "recipientName" TEXT NOT NULL,
    "phone" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileAddress_userId_idx" ON "ProfileAddress"("userId");

-- CreateIndex
CREATE INDEX "ProfileAddress_userId_isDefault_idx" ON "ProfileAddress"("userId", "isDefault");

-- AddForeignKey
ALTER TABLE "ProfileAddress" ADD CONSTRAINT "ProfileAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
