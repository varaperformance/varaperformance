-- Pricing Plans seed data
-- Run: psql $DATABASE_URL -f prisma/seeds/seed-pricing-plans.sql

-- Free Forever plan
INSERT INTO "PricingPlan" (id, slug, name, description, audience, "priceInCents", "periodLabel", cta, "ctaLink", highlighted, "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'pricing-plan-0001-0001-000000000001',
  'free-forever',
  'Free Forever',
  'Everything you need to track your fitness journey',
  'FREE',
  0,
  'forever',
  'Get Started',
  '/register',
  true,
  true,
  0,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  audience = EXCLUDED.audience,
  "priceInCents" = EXCLUDED."priceInCents",
  "periodLabel" = EXCLUDED."periodLabel",
  cta = EXCLUDED.cta,
  "ctaLink" = EXCLUDED."ctaLink",
  highlighted = EXCLUDED.highlighted,
  "isActive" = EXCLUDED."isActive",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();

-- Coaches plan
INSERT INTO "PricingPlan" (id, slug, name, description, audience, "priceInCents", "periodLabel", cta, "ctaLink", highlighted, "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'pricing-plan-0001-0001-000000000002',
  'coaches',
  'Coaches',
  'For verified, credentialed fitness professionals',
  'COACH',
  1999,
  '/month',
  'Apply Now',
  '/coaches/apply',
  false,
  true,
  1,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  audience = EXCLUDED.audience,
  "priceInCents" = EXCLUDED."priceInCents",
  "periodLabel" = EXCLUDED."periodLabel",
  cta = EXCLUDED.cta,
  "ctaLink" = EXCLUDED."ctaLink",
  highlighted = EXCLUDED.highlighted,
  "isActive" = EXCLUDED."isActive",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();

-- Gyms plan
INSERT INTO "PricingPlan" (id, slug, name, description, audience, "priceInCents", "periodLabel", cta, "ctaLink", highlighted, "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'pricing-plan-0001-0001-000000000003',
  'gyms',
  'Gyms',
  'For gyms and fitness facilities',
  'GYM',
  4999,
  '/month',
  'Contact Sales',
  '/contact',
  false,
  true,
  2,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  audience = EXCLUDED.audience,
  "priceInCents" = EXCLUDED."priceInCents",
  "periodLabel" = EXCLUDED."periodLabel",
  cta = EXCLUDED.cta,
  "ctaLink" = EXCLUDED."ctaLink",
  highlighted = EXCLUDED.highlighted,
  "isActive" = EXCLUDED."isActive",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();

-- Clear existing features for seeded plans
DELETE FROM "PricingPlanFeature" WHERE "planId" IN (
  'pricing-plan-0001-0001-000000000001',
  'pricing-plan-0001-0001-000000000002',
  'pricing-plan-0001-0001-000000000003'
);

-- Free Forever features
INSERT INTO "PricingPlanFeature" (id, "planId", text, "sortOrder", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000001', 'Unlimited workout logging', 0, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000001', 'Barcode scanning for food logging', 1, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000001', 'Macro tracking and management', 2, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000001', 'Progress analytics and charts', 3, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000001', 'Exercise library with videos', 4, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000001', 'Custom program builder', 5, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000001', 'Custom profile themes and widgets', 6, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000001', 'Gym partner matching', 7, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000001', 'Data export (your data is yours)', 8, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000001', 'Ad-free health tools', 9, NOW(), NOW());

-- Coaches features
INSERT INTO "PricingPlanFeature" (id, "planId", text, "sortOrder", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000002', 'Requires NSCA, ACSM, NASM, or equivalent certification', 0, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000002', 'All free features included', 1, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000002', 'Up to 25 client profiles', 2, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000002', 'Assign custom workouts to clients', 3, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000002', 'View client logs, diet, and metrics', 4, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000002', 'Built-in scheduling & check-ins', 5, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000002', 'In-app messaging with clients', 6, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000002', 'Payments & contracts handled by us', 7, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000002', 'Priority support', 8, NOW(), NOW());

-- Gyms features
INSERT INTO "PricingPlanFeature" (id, "planId", text, "sortOrder", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000003', 'All free features included', 0, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000003', 'Unlimited member profiles', 1, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000003', 'Multiple coach accounts', 2, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000003', 'Facility-wide analytics dashboard', 3, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000003', 'Class scheduling and management', 4, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000003', 'Member progress tracking', 5, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000003', 'Custom branding', 6, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000003', 'API access', 7, NOW(), NOW()),
  (gen_random_uuid(), 'pricing-plan-0001-0001-000000000003', 'Dedicated support', 8, NOW(), NOW());
