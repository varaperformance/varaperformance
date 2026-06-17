-- CreateTable
CREATE TABLE "CoachTierSubscription" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "pricingPlanId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "scheduledCancellationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachTierSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachTierSubscription_coachId_key" ON "CoachTierSubscription"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachTierSubscription_stripeSubscriptionId_key" ON "CoachTierSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "CoachTierSubscription_status_idx" ON "CoachTierSubscription"("status");

-- CreateIndex
CREATE INDEX "CoachTierSubscription_stripeSubscriptionId_idx" ON "CoachTierSubscription"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "CoachTierSubscription" ADD CONSTRAINT "CoachTierSubscription_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachTierSubscription" ADD CONSTRAINT "CoachTierSubscription_pricingPlanId_fkey" FOREIGN KEY ("pricingPlanId") REFERENCES "PricingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
