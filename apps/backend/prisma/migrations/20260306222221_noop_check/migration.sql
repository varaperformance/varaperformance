-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_coachId_fkey";

-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "coachId" DROP NOT NULL,
ALTER COLUMN "clientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ElevateStory" ALTER COLUMN "expiresAt" SET DEFAULT NOW() + INTERVAL '24 hours';

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
