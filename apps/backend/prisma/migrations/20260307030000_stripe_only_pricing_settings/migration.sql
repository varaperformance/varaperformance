-- Stripe-only migration: provider cleanup + pricing/admin settings

-- 1) Add pricing plan tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'PricingPlanAudience'
  ) THEN
    CREATE TYPE "PricingPlanAudience" AS ENUM ('FREE', 'COACH', 'GYM');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PricingPlan" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "audience" "PricingPlanAudience" NOT NULL,
  "priceInCents" INTEGER NOT NULL,
  "periodLabel" TEXT,
  "cta" TEXT NOT NULL,
  "ctaLink" TEXT NOT NULL,
  "highlighted" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PricingPlan_slug_key"
  ON "PricingPlan"("slug");
CREATE INDEX IF NOT EXISTS "PricingPlan_audience_isActive_idx"
  ON "PricingPlan"("audience", "isActive");
CREATE INDEX IF NOT EXISTS "PricingPlan_sortOrder_idx"
  ON "PricingPlan"("sortOrder");

CREATE TABLE IF NOT EXISTS "PricingPlanFeature" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PricingPlanFeature_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PricingPlanFeature_planId_sortOrder_idx"
  ON "PricingPlanFeature"("planId", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PricingPlanFeature_planId_fkey'
  ) THEN
    ALTER TABLE "PricingPlanFeature"
      ADD CONSTRAINT "PricingPlanFeature_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "PricingPlan"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PlatformSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

INSERT INTO "PlatformSetting" ("key", "value")
VALUES ('payments.platform_fee_percent', '15')
ON CONFLICT ("key") DO NOTHING;

-- 2) Ensure provider fields are STRIPE for existing rows
UPDATE "Booking" SET "paymentProvider" = 'STRIPE' WHERE "paymentProvider"::text <> 'STRIPE';
UPDATE "Subscription" SET "paymentProvider" = 'STRIPE' WHERE "paymentProvider"::text <> 'STRIPE';
UPDATE "Payment" SET "provider" = 'STRIPE' WHERE "provider"::text <> 'STRIPE';
UPDATE "CoachLedgerEntry" SET "provider" = 'STRIPE' WHERE "provider"::text <> 'STRIPE';
UPDATE "CoachPayout" SET "provider" = 'STRIPE' WHERE "provider"::text <> 'STRIPE';

-- 3) Move payment customer FK from PaddleCustomer to StripeCustomer
-- Create synthetic Stripe customers for legacy rows if needed.
INSERT INTO "StripeCustomer" ("id", "userId", "stripeCustomerId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  pc."userId",
  CONCAT('legacy_', pc."paddleCustomerId"),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PaddleCustomer" pc
LEFT JOIN "StripeCustomer" sc ON sc."userId" = pc."userId"
WHERE sc."id" IS NULL;

-- map Payment.customerId from PaddleCustomer.id to StripeCustomer.id by userId
UPDATE "Payment" p
SET "customerId" = sc."id"
FROM "PaddleCustomer" pc
JOIN "StripeCustomer" sc ON sc."userId" = pc."userId"
WHERE p."customerId" = pc."id";

-- Swap FK to StripeCustomer
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_customerId_fkey";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Payment_customerId_fkey'
      AND conrelid = '"Payment"'::regclass
  ) THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "StripeCustomer"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 4) Rename refund provider identifier to Stripe naming
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Refund' AND column_name = 'paddleAdjustmentId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Refund' AND column_name = 'stripeRefundId'
  ) THEN
    ALTER TABLE "Refund" RENAME COLUMN "paddleAdjustmentId" TO "stripeRefundId";
  END IF;
END $$;

-- 5) Stripe defaults for new rows
ALTER TABLE "Booking" ALTER COLUMN "paymentProvider" SET DEFAULT 'STRIPE';
ALTER TABLE "Subscription" ALTER COLUMN "paymentProvider" SET DEFAULT 'STRIPE';
ALTER TABLE "Payment" ALTER COLUMN "provider" SET DEFAULT 'STRIPE';
ALTER TABLE "CoachLedgerEntry" ALTER COLUMN "provider" SET DEFAULT 'STRIPE';
