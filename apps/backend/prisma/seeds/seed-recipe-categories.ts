import 'dotenv/config';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const recipeCategories = [
  {
    slug: 'appetizers',
    name: 'Appetizers',
    description: 'Small dishes served before the main course',
    sortOrder: 1,
  },
  {
    slug: 'entrees',
    name: 'Entrees',
    description: 'Main course dishes',
    sortOrder: 2,
  },
  {
    slug: 'sides',
    name: 'Sides',
    description: 'Side dishes to complement a main course',
    sortOrder: 3,
  },
  {
    slug: 'snacks',
    name: 'Snacks',
    description: 'Quick bites and light snacks',
    sortOrder: 4,
  },
  {
    slug: 'desserts',
    name: 'Desserts',
    description: 'Sweet treats and desserts',
    sortOrder: 5,
  },
  {
    slug: 'breakfast',
    name: 'Breakfast',
    description: 'Morning meals and brunch items',
    sortOrder: 6,
  },
  {
    slug: 'smoothies-shakes',
    name: 'Smoothies & Shakes',
    description: 'Blended drinks and protein shakes',
    sortOrder: 7,
  },
  {
    slug: 'soups',
    name: 'Soups',
    description: 'Soups, stews, and chilis',
    sortOrder: 8,
  },
  {
    slug: 'salads',
    name: 'Salads',
    description: 'Fresh salads and bowls',
    sortOrder: 9,
  },
  {
    slug: 'meal-prep',
    name: 'Meal Prep',
    description: 'Recipes designed for batch cooking and meal preparation',
    sortOrder: 10,
  },
  {
    slug: 'high-protein',
    name: 'High Protein',
    description: 'Recipes with high protein content for muscle building',
    sortOrder: 11,
  },
  {
    slug: 'low-carb',
    name: 'Low Carb',
    description: 'Low carbohydrate and keto-friendly recipes',
    sortOrder: 12,
  },
  {
    slug: 'gluten-free',
    name: 'Gluten Free',
    description: 'Recipes free of gluten-containing ingredients',
    sortOrder: 13,
  },
  {
    slug: 'dairy-free',
    name: 'Dairy Free',
    description: 'Recipes without dairy products',
    sortOrder: 14,
  },
  {
    slug: 'vegan',
    name: 'Vegan',
    description: 'Plant-based recipes with no animal products',
    sortOrder: 15,
  },
  {
    slug: 'vegetarian',
    name: 'Vegetarian',
    description: 'Meatless recipes that may include dairy and eggs',
    sortOrder: 16,
  },
  {
    slug: 'quick-easy',
    name: 'Quick & Easy',
    description: 'Recipes ready in 30 minutes or less',
    sortOrder: 17,
  },
];

async function main() {
  console.log('Seeding recipe categories...');

  for (const category of recipeCategories) {
    await prisma.recipeCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
      },
      create: category,
    });
  }

  console.log(`Seeded ${recipeCategories.length} recipe categories`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
