-- Stripe Connect marketplace support: provider fields, coach connect account, and payout ledger

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentProvider') THEN
    CREATE TYPE "PaymentProvider" AS ENUM ('PADDLE', 'STRIPE');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoachLedgerEntryType') THEN
    CREATE TYPE "CoachLedgerEntryType" AS ENUM ('SALE', 'REFUND', 'CHARGEBACK', 'ADJUSTMENT', 'PAYOUT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CoachPayoutStatus') THEN
    CREATE TYPE "CoachPayoutStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'PAID', 'FAILED');
  END IF;
END $$;

ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PENDING';

ALTER TABLE "Coach"
  ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Coach_stripeAccountId_key" ON "Coach"("stripeAccountId");

ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'PADDLE';

ALTER TABLE "Subscription"
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'PADDLE';

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeInvoiceId" TEXT,
  ADD COLUMN IF NOT EXISTS "provider" "PaymentProvider" NOT NULL DEFAULT 'PADDLE';

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripeCheckoutSessionId_key" ON "Payment"("stripeCheckoutSessionId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

CREATE TABLE IF NOT EXISTS "StripeCustomer" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stripeCustomerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StripeCustomer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StripeCustomer_userId_key" ON "StripeCustomer"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "StripeCustomer_stripeCustomerId_key" ON "StripeCustomer"("stripeCustomerId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'StripeCustomer_userId_fkey'
  ) THEN
    ALTER TABLE "StripeCustomer"
      ADD CONSTRAINT "StripeCustomer_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CoachPayout" (
  "id" TEXT NOT NULL,
  "coachId" TEXT NOT NULL,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'STRIPE',
  "status" "CoachPayoutStatus" NOT NULL DEFAULT 'PENDING',
  "amountInCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "externalPayoutId" TEXT,
  "failureReason" TEXT,
  "paidAt" TIMESTAMP(3),
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CoachPayout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CoachPayout_coachId_status_idx" ON "CoachPayout"("coachId", "status");
CREATE INDEX IF NOT EXISTS "CoachPayout_createdAt_idx" ON "CoachPayout"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CoachPayout_coachId_fkey'
  ) THEN
    ALTER TABLE "CoachPayout"
      ADD CONSTRAINT "CoachPayout_coachId_fkey"
      FOREIGN KEY ("coachId") REFERENCES "Coach"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CoachLedgerEntry" (
  "id" TEXT NOT NULL,
  "coachId" TEXT NOT NULL,
  "paymentId" TEXT,
  "payoutId" TEXT,
  "provider" "PaymentProvider" NOT NULL DEFAULT 'PADDLE',
  "type" "CoachLedgerEntryType" NOT NULL,
  "grossAmountInCents" INTEGER NOT NULL,
  "platformFeeInCents" INTEGER NOT NULL DEFAULT 0,
  "processorFeeInCents" INTEGER NOT NULL DEFAULT 0,
  "netAmountInCents" INTEGER NOT NULL,
  "runningBalanceInCents" INTEGER,
  "referenceId" TEXT,
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CoachLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CoachLedgerEntry_coachId_createdAt_idx" ON "CoachLedgerEntry"("coachId", "createdAt");
CREATE INDEX IF NOT EXISTS "CoachLedgerEntry_type_idx" ON "CoachLedgerEntry"("type");
CREATE INDEX IF NOT EXISTS "CoachLedgerEntry_paymentId_idx" ON "CoachLedgerEntry"("paymentId");
CREATE INDEX IF NOT EXISTS "CoachLedgerEntry_payoutId_idx" ON "CoachLedgerEntry"("payoutId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CoachLedgerEntry_coachId_fkey'
  ) THEN
    ALTER TABLE "CoachLedgerEntry"
      ADD CONSTRAINT "CoachLedgerEntry_coachId_fkey"
      FOREIGN KEY ("coachId") REFERENCES "Coach"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CoachLedgerEntry_paymentId_fkey'
  ) THEN
    ALTER TABLE "CoachLedgerEntry"
      ADD CONSTRAINT "CoachLedgerEntry_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CoachLedgerEntry_payoutId_fkey'
  ) THEN
    ALTER TABLE "CoachLedgerEntry"
      ADD CONSTRAINT "CoachLedgerEntry_payoutId_fkey"
      FOREIGN KEY ("payoutId") REFERENCES "CoachPayout"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
