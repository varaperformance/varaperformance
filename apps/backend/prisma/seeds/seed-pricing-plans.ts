import 'dotenv/config';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const PLAN_IDS = {
  FREE: 'pricing-plan-0001-0001-000000000001',
  COACH: 'pricing-plan-0001-0001-000000000002',
  GYM: 'pricing-plan-0001-0001-000000000003',
};

const plans = [
  {
    id: PLAN_IDS.FREE,
    slug: 'free-forever',
    name: 'Free Forever',
    description: 'Everything you need to track your fitness journey',
    audience: 'FREE' as const,
    priceInCents: 0,
    periodLabel: 'forever',
    cta: 'Get Started',
    ctaLink: '/register',
    highlighted: true,
    isActive: true,
    sortOrder: 0,
    features: [
      'Unlimited workout logging',
      'Barcode scanning for food logging',
      'Macro tracking and management',
      'Progress analytics and charts',
      'Exercise library with videos',
      'Custom program builder',
      'Custom profile themes and widgets',
      'Gym partner matching',
      'Data export (your data is yours)',
      'Ad-free health tools',
    ],
  },
  {
    id: PLAN_IDS.COACH,
    slug: 'coaches',
    name: 'Coaches',
    description: 'For verified, credentialed fitness professionals',
    audience: 'COACH' as const,
    priceInCents: 1999,
    periodLabel: '/month',
    cta: 'Apply Now',
    ctaLink: '/coaches/apply',
    highlighted: false,
    isActive: true,
    sortOrder: 1,
    features: [
      'Requires NSCA, ACSM, NASM, or equivalent certification',
      'All free features included',
      'Up to 25 client profiles',
      'Assign custom workouts to clients',
      'View client logs, diet, and metrics',
      'Built-in scheduling & check-ins',
      'In-app messaging with clients',
      'Payments & contracts handled by us',
      'Priority support',
    ],
  },
  {
    id: PLAN_IDS.GYM,
    slug: 'gyms',
    name: 'Gyms',
    description: 'For gyms and fitness facilities',
    audience: 'GYM' as const,
    priceInCents: 4999,
    periodLabel: '/month',
    cta: 'Contact Sales',
    ctaLink: '/contact',
    highlighted: false,
    isActive: true,
    sortOrder: 2,
    features: [
      'All free features included',
      'Unlimited member profiles',
      'Multiple coach accounts',
      'Facility-wide analytics dashboard',
      'Class scheduling and management',
      'Member progress tracking',
      'Custom branding',
      'API access',
      'Dedicated support',
    ],
  },
];

async function main() {
  console.log('🚀 Starting pricing plans seed...');

  for (const plan of plans) {
    const { features, ...planData } = plan;

    await prisma.pricingPlan.upsert({
      where: { id: plan.id },
      update: {
        slug: planData.slug,
        name: planData.name,
        description: planData.description,
        audience: planData.audience,
        priceInCents: planData.priceInCents,
        periodLabel: planData.periodLabel,
        cta: planData.cta,
        ctaLink: planData.ctaLink,
        highlighted: planData.highlighted,
        isActive: planData.isActive,
        sortOrder: planData.sortOrder,
      },
      create: planData,
    });

    // Replace features: delete existing then re-create
    await prisma.pricingPlanFeature.deleteMany({
      where: { planId: plan.id },
    });

    await prisma.pricingPlanFeature.createMany({
      data: features.map((text, index) => ({
        planId: plan.id,
        text,
        sortOrder: index,
      })),
    });

    console.log(`  ✓ Plan: ${plan.name} (${features.length} features)`);
  }

  console.log('✅ Pricing plans seed completed!');
  console.log(`   - ${plans.length} plans seeded`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
