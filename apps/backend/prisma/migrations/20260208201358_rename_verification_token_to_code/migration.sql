/*
  Warnings:

  - You are about to drop the column `verificationToken` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "completedAt" TIMESTAMP(3),
ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL,
ALTER COLUMN "displayName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "verificationToken",
ADD COLUMN     "verificationCode" CHAR(6);
