-- Drop legacy provider artifacts now that runtime is Stripe-only.
-- This migration is forward-only and does not modify prior migration history.

-- 1) Drop legacy columns.
ALTER TABLE "Booking" DROP COLUMN IF EXISTS "paddleTransactionId";
ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "paddleSubscriptionId";

ALTER TABLE "Payment" DROP COLUMN IF EXISTS "paddleTransactionId";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "paddleSubscriptionId";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "paddleInvoiceId";

ALTER TABLE "Refund" DROP COLUMN IF EXISTS "paddleAdjustmentId";

-- 2) Drop legacy indexes if still present.
DROP INDEX IF EXISTS "Subscription_paddleSubscriptionId_key";
DROP INDEX IF EXISTS "Payment_paddleTransactionId_key";
DROP INDEX IF EXISTS "Refund_paddleAdjustmentId_key";
DROP INDEX IF EXISTS "PaddleCustomer_userId_key";
DROP INDEX IF EXISTS "PaddleCustomer_paddleCustomerId_key";
DROP INDEX IF EXISTS "PaddleCustomer_paddleCustomerId_idx";

-- 3) Drop legacy customer table after FK migration to StripeCustomer.
DROP TABLE IF EXISTS "PaddleCustomer";

-- 4) Recreate PaymentProvider enum with Stripe-only value.
-- PostgreSQL enum value removal is handled by type replacement.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'PaymentProvider'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = 'PaymentProvider_new'
    ) THEN
      CREATE TYPE "PaymentProvider_new" AS ENUM ('STRIPE');
    END IF;

    ALTER TABLE "Booking" ALTER COLUMN "paymentProvider" DROP DEFAULT;
    ALTER TABLE "Subscription" ALTER COLUMN "paymentProvider" DROP DEFAULT;
    ALTER TABLE "Payment" ALTER COLUMN "provider" DROP DEFAULT;
    ALTER TABLE "CoachLedgerEntry" ALTER COLUMN "provider" DROP DEFAULT;
    ALTER TABLE "CoachPayout" ALTER COLUMN "provider" DROP DEFAULT;

    ALTER TABLE "Booking"
      ALTER COLUMN "paymentProvider"
      TYPE "PaymentProvider_new"
      USING (CASE WHEN "paymentProvider"::text = 'STRIPE' THEN 'STRIPE' ELSE 'STRIPE' END)::"PaymentProvider_new";

    ALTER TABLE "Subscription"
      ALTER COLUMN "paymentProvider"
      TYPE "PaymentProvider_new"
      USING (CASE WHEN "paymentProvider"::text = 'STRIPE' THEN 'STRIPE' ELSE 'STRIPE' END)::"PaymentProvider_new";

    ALTER TABLE "Payment"
      ALTER COLUMN "provider"
      TYPE "PaymentProvider_new"
      USING (CASE WHEN "provider"::text = 'STRIPE' THEN 'STRIPE' ELSE 'STRIPE' END)::"PaymentProvider_new";

    ALTER TABLE "CoachLedgerEntry"
      ALTER COLUMN "provider"
      TYPE "PaymentProvider_new"
      USING (CASE WHEN "provider"::text = 'STRIPE' THEN 'STRIPE' ELSE 'STRIPE' END)::"PaymentProvider_new";

    ALTER TABLE "CoachPayout"
      ALTER COLUMN "provider"
      TYPE "PaymentProvider_new"
      USING (CASE WHEN "provider"::text = 'STRIPE' THEN 'STRIPE' ELSE 'STRIPE' END)::"PaymentProvider_new";

    DROP TYPE "PaymentProvider";
    ALTER TYPE "PaymentProvider_new" RENAME TO "PaymentProvider";

    ALTER TABLE "Booking" ALTER COLUMN "paymentProvider" SET DEFAULT 'STRIPE';
    ALTER TABLE "Subscription" ALTER COLUMN "paymentProvider" SET DEFAULT 'STRIPE';
    ALTER TABLE "Payment" ALTER COLUMN "provider" SET DEFAULT 'STRIPE';
    ALTER TABLE "CoachLedgerEntry" ALTER COLUMN "provider" SET DEFAULT 'STRIPE';
    ALTER TABLE "CoachPayout" ALTER COLUMN "provider" SET DEFAULT 'STRIPE';
  END IF;
END $$;
