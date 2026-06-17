-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "expiresAt" DROP NOT NULL,
ALTER COLUMN "verificationToken" DROP NOT NULL;
