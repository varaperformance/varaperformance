import 'dotenv/config';
import { PrismaClient } from '../../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// TheMealDB types
// ---------------------------------------------------------------------------
interface MealDBMeal {
  idMeal: string;
  strMeal: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string | null;
  [key: string]: string | null;
}

// ---------------------------------------------------------------------------
// Category mapping: TheMealDB category → our RecipeCategory slugs
// ---------------------------------------------------------------------------
const CATEGORY_MAP: Record<string, string[]> = {
  Beef: ['entrees'],
  Chicken: ['entrees'],
  Dessert: ['desserts'],
  Lamb: ['entrees'],
  Miscellaneous: [],
  Pasta: ['entrees'],
  Pork: ['entrees'],
  Seafood: ['entrees'],
  Side: ['sides'],
  Starter: ['appetizers'],
  Vegan: ['vegan', 'entrees'],
  Vegetarian: ['vegetarian', 'entrees'],
  Breakfast: ['breakfast'],
  Goat: ['entrees'],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse TheMealDB ingredients (1-20) into { name, measure } pairs. */
function extractIngredients(
  meal: MealDBMeal,
): { name: string; measure: string }[] {
  const result: { name: string; measure: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (meal[`strIngredient${i}`] ?? '').trim();
    const measure = (meal[`strMeasure${i}`] ?? '').trim();
    if (name) result.push({ name, measure });
  }
  return result;
}

/** Split TheMealDB instructions into direction steps. */
function parseDirections(instructions: string): string[] {
  // Split on common step patterns
  const raw = instructions
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Try splitting on numbered steps first (e.g. "STEP 1", "step 1", "1.")
  const numbered = raw.split(/(?:STEP\s*\d+\s*[-–:]?\s*|step\s*\d+\s*[-–:]?\s*|\n\d+\.\s*)/i);
  if (numbered.length > 2) {
    return numbered
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
  }

  // Fall back to splitting on double newlines or single newlines for long blocks
  const paragraphs = raw
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (paragraphs.length >= 2) return paragraphs;

  // Last resort: split on single newlines
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

/** Simple default food macros — just enough to have something meaningful. */
const DEFAULT_MACROS = {
  calories: 50,
  protein: 2,
  carbohydrates: 5,
  fat: 2,
};

// ---------------------------------------------------------------------------
// Food cache — reuse across recipes
// ---------------------------------------------------------------------------
const foodCache = new Map<string, string>(); // lowercase name → food id

async function getOrCreateFood(name: string): Promise<string> {
  const key = name.toLowerCase().trim();
  if (foodCache.has(key)) return foodCache.get(key)!;

  // Try to find existing food by name (case insensitive)
  const existing = await prisma.food.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });

  if (existing) {
    foodCache.set(key, existing.id);
    return existing.id;
  }

  // Create a basic ingredient food entry
  const created = await prisma.food.create({
    data: {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      source: 'SYSTEM',
      isVerified: false,
      servingSize: 1,
      servingUnit: 'SERVING',
      servingLabel: `1 serving of ${name}`,
      ...DEFAULT_MACROS,
    },
    select: { id: true },
  });

  foodCache.set(key, created.id);
  return created.id;
}

// ---------------------------------------------------------------------------
// Fetch meals from TheMealDB
// ---------------------------------------------------------------------------
async function fetchMealsByLetter(letter: string): Promise<MealDBMeal[]> {
  const url = `https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`;
  const res = await fetch(url);
  const data = (await res.json()) as { meals: MealDBMeal[] | null };
  return data.meals ?? [];
}

async function fetchAllMeals(): Promise<MealDBMeal[]> {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const all: MealDBMeal[] = [];

  for (const letter of letters) {
    console.log(`  Fetching letter "${letter}"...`);
    try {
      const meals = await fetchMealsByLetter(letter);
      all.push(...meals);
    } catch {
      console.warn(`  Failed to fetch letter "${letter}", skipping`);
    }
    // Be polite — small delay between requests
    await new Promise((r) => setTimeout(r, 300));
  }

  return all;
}

// ---------------------------------------------------------------------------
// Seed a single recipe
// ---------------------------------------------------------------------------
async function seedRecipe(
  meal: MealDBMeal,
  adminUserId: string,
  categoryMap: Map<string, string>,
): Promise<boolean> {
  // Check if recipe already exists by name
  const existing = await prisma.recipe.findFirst({
    where: {
      name: { equals: meal.strMeal, mode: 'insensitive' },
      createdById: adminUserId,
    },
    select: { id: true },
  });
  if (existing) return false;

  const rawIngredients = extractIngredients(meal);
  if (rawIngredients.length === 0) return false;

  // Resolve food IDs for all ingredients
  const ingredientData: {
    foodId: string;
    quantity: number;
    note: string | null;
    sortOrder: number;
  }[] = [];

  for (let i = 0; i < rawIngredients.length; i++) {
    const { name, measure } = rawIngredients[i];
    const foodId = await getOrCreateFood(name);
    ingredientData.push({
      foodId,
      quantity: 1,
      note: measure || null,
      sortOrder: i,
    });
  }

  // Get food macros for computation
  const foodIds = ingredientData.map((i) => i.foodId);
  const foods = await prisma.food.findMany({
    where: { id: { in: foodIds } },
    select: { id: true, calories: true, protein: true, carbohydrates: true, fat: true },
  });
  const foodMap = new Map(foods.map((f) => [f.id, f]));

  const computedIngredients = ingredientData.map((ing) => {
    const food = foodMap.get(ing.foodId)!;
    return {
      ...ing,
      totalCalories: food.calories * ing.quantity,
      totalProtein: food.protein * ing.quantity,
      totalCarbs: food.carbohydrates * ing.quantity,
      totalFat: food.fat * ing.quantity,
    };
  });

  const totals = computedIngredients.reduce(
    (acc, i) => ({
      calories: acc.calories + i.totalCalories,
      protein: acc.protein + i.totalProtein,
      carbs: acc.carbs + i.totalCarbs,
      fat: acc.fat + i.totalFat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const totalServings = 4; // Default to 4 servings

  // Map MealDB category to our category IDs
  const slugs = CATEGORY_MAP[meal.strCategory] ?? [];
  const categoryIds = slugs
    .map((slug) => categoryMap.get(slug))
    .filter(Boolean) as string[];

  const directions = parseDirections(meal.strInstructions);

  await prisma.recipe.create({
    data: {
      createdById: adminUserId,
      name: meal.strMeal,
      description: `${meal.strArea} ${meal.strCategory.toLowerCase()} dish`,
      imageUrl: meal.strMealThumb ?? null,
      directions,
      totalServings,
      isPublic: true,
      isVerified: true,
      totalCalories: Math.round(totals.calories * 10) / 10,
      totalProtein: Math.round(totals.protein * 10) / 10,
      totalCarbs: Math.round(totals.carbs * 10) / 10,
      totalFat: Math.round(totals.fat * 10) / 10,
      perServingCalories:
        Math.round((totals.calories / totalServings) * 10) / 10,
      perServingProtein:
        Math.round((totals.protein / totalServings) * 10) / 10,
      perServingCarbs:
        Math.round((totals.carbs / totalServings) * 10) / 10,
      perServingFat:
        Math.round((totals.fat / totalServings) * 10) / 10,
      ingredients: {
        create: computedIngredients.map((ing) => ({
          foodId: ing.foodId,
          quantity: ing.quantity,
          note: ing.note,
          sortOrder: ing.sortOrder,
          totalCalories: ing.totalCalories,
          totalProtein: ing.totalProtein,
          totalCarbs: ing.totalCarbs,
          totalFat: ing.totalFat,
        })),
      },
      ...(categoryIds.length > 0 && {
        categories: {
          create: categoryIds.map((id) => ({ recipeCategoryId: id })),
        },
      }),
    },
  });

  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('🍳 Seeding recipes from TheMealDB...\n');

  // Get or identify admin user
  const adminUser = await prisma.user.findFirst({
    where: {
      roles: { some: { role: { name: 'Administrator' } } },
    },
    select: { id: true, email: true },
  });

  if (!adminUser) {
    throw new Error(
      'No admin user found. Create a user with the "Admin" role first.',
    );
  }
  console.log(`Using admin user: ${adminUser.email} (${adminUser.id})\n`);

  // Load recipe category slug → id map
  const categories = await prisma.recipeCategory.findMany({
    select: { id: true, slug: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.slug, c.id]));
  console.log(`Found ${categories.length} recipe categories.\n`);

  // Fetch all meals from TheMealDB (A-Z)
  console.log('Fetching meals from TheMealDB API...');
  const meals = await fetchAllMeals();
  console.log(`\nFetched ${meals.length} meals total.\n`);

  // Seed each meal
  let created = 0;
  let skipped = 0;

  for (const meal of meals) {
    try {
      const wasCreated = await seedRecipe(meal, adminUser.id, categoryMap);
      if (wasCreated) {
        created++;
        process.stdout.write(`  ✓ ${meal.strMeal}\n`);
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`  ✗ Failed: ${meal.strMeal} — ${err}`);
    }
  }

  console.log(
    `\nDone! Created ${created} recipes, skipped ${skipped} duplicates.`,
  );
  console.log(`Food cache: ${foodCache.size} unique ingredients.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
