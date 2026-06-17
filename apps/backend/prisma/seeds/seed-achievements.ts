import 'dotenv/config';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const achievements = [
  // WORKOUT category
  {
    slug: 'first-workout',
    name: 'First Workout',
    description: 'Log your very first workout session',
    icon: 'dumbbell',
    category: 'WORKOUT' as const,
    threshold: 1,
    sortOrder: 1,
  },
  {
    slug: '10-workouts',
    name: 'Getting Started',
    description: 'Complete 10 workout sessions',
    icon: 'zap',
    category: 'WORKOUT' as const,
    threshold: 10,
    sortOrder: 2,
  },
  {
    slug: '50-workouts',
    name: 'Dedicated',
    description: 'Complete 50 workout sessions',
    icon: 'flame',
    category: 'WORKOUT' as const,
    threshold: 50,
    sortOrder: 3,
  },
  {
    slug: '100-workouts',
    name: 'Century Club',
    description: 'Complete 100 workout sessions',
    icon: 'trophy',
    category: 'WORKOUT' as const,
    threshold: 100,
    sortOrder: 4,
  },

  // STREAK category
  {
    slug: '7-day-streak',
    name: 'Week Warrior',
    description: 'Maintain a 7-day habit streak',
    icon: 'flame',
    category: 'STREAK' as const,
    threshold: 7,
    sortOrder: 1,
  },
  {
    slug: '30-day-streak',
    name: 'Monthly Master',
    description: 'Maintain a 30-day habit streak',
    icon: 'calendar-check',
    category: 'STREAK' as const,
    threshold: 30,
    sortOrder: 2,
  },
  {
    slug: '100-day-streak',
    name: 'Unstoppable',
    description: 'Maintain a 100-day habit streak',
    icon: 'crown',
    category: 'STREAK' as const,
    threshold: 100,
    sortOrder: 3,
  },

  // NUTRITION category
  {
    slug: 'first-food-log',
    name: 'Calorie Counter',
    description: 'Log your first food entry',
    icon: 'utensils-crossed',
    category: 'NUTRITION' as const,
    threshold: 1,
    sortOrder: 1,
  },
  {
    slug: '100-food-logs',
    name: 'Nutrition Nerd',
    description: 'Log 100 food entries',
    icon: 'chef-hat',
    category: 'NUTRITION' as const,
    threshold: 100,
    sortOrder: 2,
  },

  // COACHING category
  {
    slug: 'first-session',
    name: 'Coached Up',
    description: 'Complete your first coaching session',
    icon: 'users',
    category: 'COACHING' as const,
    threshold: 1,
    sortOrder: 1,
  },

  // SOCIAL category
  {
    slug: 'first-post',
    name: 'Social Butterfly',
    description: 'Create your first community post',
    icon: 'message-circle',
    category: 'SOCIAL' as const,
    threshold: 1,
    sortOrder: 1,
  },
  {
    slug: 'create-challenge',
    name: 'Challenge Creator',
    description: 'Create your first community challenge',
    icon: 'flag',
    category: 'SOCIAL' as const,
    threshold: 1,
    sortOrder: 2,
  },
  {
    slug: 'challenge-participant',
    name: 'Challenger',
    description: 'Participate in your first challenge',
    icon: 'swords',
    category: 'SOCIAL' as const,
    threshold: 1,
    sortOrder: 3,
  },
];

async function main() {
  console.log('Seeding achievements...');

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { slug: achievement.slug },
      update: {
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        category: achievement.category,
        threshold: achievement.threshold,
        sortOrder: achievement.sortOrder,
      },
      create: {
        ...achievement,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${achievements.length} achievements`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
