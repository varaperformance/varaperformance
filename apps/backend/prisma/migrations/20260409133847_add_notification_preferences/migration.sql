-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_SHIPPED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_REFUNDED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'POST_COMMENT_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'POST_HIGH_FIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AMBASSADOR_APPLICATION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AMBASSADOR_APPLICATION_DENIED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SESSION_REMINDER';

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookings" BOOLEAN NOT NULL DEFAULT true,
    "messages" BOOLEAN NOT NULL DEFAULT true,
    "payments" BOOLEAN NOT NULL DEFAULT true,
    "subscriptions" BOOLEAN NOT NULL DEFAULT true,
    "gymPartners" BOOLEAN NOT NULL DEFAULT true,
    "workoutPlans" BOOLEAN NOT NULL DEFAULT true,
    "reviews" BOOLEAN NOT NULL DEFAULT true,
    "commerce" BOOLEAN NOT NULL DEFAULT true,
    "social" BOOLEAN NOT NULL DEFAULT true,
    "sessionReminders" BOOLEAN NOT NULL DEFAULT true,
    "ambassador" BOOLEAN NOT NULL DEFAULT true,
    "systemAnnouncements" BOOLEAN NOT NULL DEFAULT true,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "digest" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" INTEGER NOT NULL DEFAULT 22,
    "quietHoursEnd" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
