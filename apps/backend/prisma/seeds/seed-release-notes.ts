import 'dotenv/config';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const releaseNotes = [
  {
    version: '2.0.0',
    title: 'Complete Redesign',
    type: 'MAJOR' as const,
    status: 'PUBLISHED' as const,
    publishedAt: new Date('2026-02-05'),
    highlights: [
      'Complete UI redesign with modern, accessible interface',
      'New dashboard with customizable widgets',
      'Advanced analytics and progress tracking',
    ],
    features: [
      'Customizable workout templates',
      'Social feed for sharing achievements',
      'Integration with popular fitness wearables',
      'AI-powered workout recommendations',
      'Voice-guided workout mode',
    ],
    improvements: [
      '50% faster app loading time',
      'Improved offline support',
      'Enhanced data synchronization',
      'Better accessibility across all features',
    ],
    fixes: [
      'Fixed calendar sync issues',
      'Resolved notification delivery delays',
      'Corrected exercise rep counting accuracy',
    ],
  },
  {
    version: '1.5.0',
    title: 'Exercise Library Expansion',
    type: 'MINOR' as const,
    status: 'PUBLISHED' as const,
    publishedAt: new Date('2025-12-15'),
    highlights: [],
    features: [
      'Exercise library with 500+ exercises',
      'Video demonstrations for all exercises',
      'Custom exercise creation',
      'Workout sharing with friends',
    ],
    improvements: [
      'Redesigned exercise search',
      'Faster workout logging',
      'Improved chart visualizations',
    ],
    fixes: [
      'Fixed dark mode inconsistencies',
      'Resolved profile image upload issues',
    ],
  },
  {
    version: '1.4.2',
    title: 'Critical Bug Fixes',
    type: 'PATCH' as const,
    status: 'PUBLISHED' as const,
    publishedAt: new Date('2025-11-01'),
    highlights: [],
    features: [],
    improvements: [],
    fixes: [
      'Critical bug fix for data sync',
      'Fixed crash on workout completion',
      'Resolved timezone issues in workout logs',
      'Fixed notification sound settings',
    ],
  },
  {
    version: '1.4.0',
    title: 'Personal Records & Achievements',
    type: 'MINOR' as const,
    status: 'PUBLISHED' as const,
    publishedAt: new Date('2025-10-10'),
    highlights: [],
    features: [
      'Personal records tracking',
      'Workout streaks and achievements',
      'Export data to CSV',
    ],
    improvements: [
      'Enhanced rest timer customization',
      'Better haptic feedback',
      'Smoother animations throughout',
    ],
    fixes: [],
  },
  {
    version: '1.3.0',
    title: 'Social Features',
    type: 'MINOR' as const,
    status: 'PUBLISHED' as const,
    publishedAt: new Date('2025-09-05'),
    highlights: [],
    features: [
      'Team challenges and competitions',
      'Leaderboards',
      'In-app messaging',
    ],
    improvements: [
      'Redesigned workout history view',
      'Improved search functionality',
    ],
    fixes: [
      'Fixed weight unit conversion',
      'Resolved calendar display issues',
    ],
  },
];

async function main() {
  console.log('Seeding release notes...');

  for (const note of releaseNotes) {
    await prisma.releaseNote.upsert({
      where: { version: note.version },
      update: note,
      create: note,
    });
    console.log(`  ✓ v${note.version} - ${note.title}`);
  }

  console.log(`Seeded ${releaseNotes.length} release notes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
