/*
  Warnings:

  - You are about to drop the column `token` on the `Session` table. All the data in the column will be lost.
  - Added the required column `encryptedToken` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokenAuthTag` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tokenIv` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wrappedKey` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Session_token_idx";

-- DropIndex
DROP INDEX "Session_token_key";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "token",
ADD COLUMN     "encryptedToken" BYTEA NOT NULL,
ADD COLUMN     "tokenAuthTag" BYTEA NOT NULL,
ADD COLUMN     "tokenIv" BYTEA NOT NULL,
ADD COLUMN     "wrappedKey" BYTEA NOT NULL;
