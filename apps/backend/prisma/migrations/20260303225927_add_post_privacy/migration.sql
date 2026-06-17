/*
  Warnings:

  - You are about to drop the column `isPublic` on the `ElevatePost` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PostPrivacy" AS ENUM ('PRIVATE', 'FRIENDS', 'PUBLIC');

-- AlterTable
ALTER TABLE "ElevatePost" DROP COLUMN "isPublic",
ADD COLUMN     "privacy" "PostPrivacy" NOT NULL DEFAULT 'PUBLIC';
