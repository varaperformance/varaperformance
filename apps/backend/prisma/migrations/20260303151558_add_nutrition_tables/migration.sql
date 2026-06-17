-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS');

-- CreateEnum
CREATE TYPE "ServingUnit" AS ENUM ('G', 'ML', 'OZ', 'CUP', 'TBSP', 'TSP', 'PIECE', 'SERVING', 'SLICE', 'BOWL', 'CONTAINER', 'SCOOP');

-- CreateEnum
CREATE TYPE "FoodSource" AS ENUM ('SYSTEM', 'USER', 'COMMUNITY', 'USDA', 'OPENFOOD');

-- AlterTable
ALTER TABLE "ContractSignature" ADD COLUMN     "digitalSignature" TEXT,
ADD COLUMN     "publicKeyFingerprint" TEXT,
ADD COLUMN     "signatureAlgorithm" TEXT NOT NULL DEFAULT 'ecdsa-p256-v1',
ADD COLUMN     "signingPayload" TEXT,
ADD COLUMN     "userSignatureInput" TEXT;

-- CreateTable
CREATE TABLE "FaqCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Food" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "description" VARCHAR(500),
    "barcode" TEXT,
    "source" "FoodSource" NOT NULL DEFAULT 'USER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "servingSize" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "servingUnit" "ServingUnit" NOT NULL DEFAULT 'SERVING',
    "servingLabel" TEXT,
    "householdSize" DOUBLE PRECISION,
    "householdUnit" TEXT,
    "calories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "protein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carbohydrates" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fiber" DOUBLE PRECISION,
    "sugar" DOUBLE PRECISION,
    "saturatedFat" DOUBLE PRECISION,
    "transFat" DOUBLE PRECISION,
    "cholesterol" DOUBLE PRECISION,
    "sodium" DOUBLE PRECISION,
    "potassium" DOUBLE PRECISION,
    "vitaminA" DOUBLE PRECISION,
    "vitaminC" DOUBLE PRECISION,
    "calcium" DOUBLE PRECISION,
    "iron" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodServing" (
    "id" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "servingSize" DOUBLE PRECISION NOT NULL,
    "servingUnit" "ServingUnit" NOT NULL,
    "servingLabel" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodServing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mealType" "MealType" NOT NULL DEFAULT 'BREAKFAST',
    "foodId" TEXT,
    "servings" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "servingSize" DOUBLE PRECISION,
    "servingUnit" "ServingUnit",
    "quickAddName" TEXT,
    "quickAddCalories" DOUBLE PRECISION,
    "quickAddProtein" DOUBLE PRECISION,
    "quickAddCarbs" DOUBLE PRECISION,
    "quickAddFat" DOUBLE PRECISION,
    "totalCalories" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProtein" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCarbs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalFat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavoriteFood" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "defaultServings" DOUBLE PRECISION,
    "defaultServingUnit" "ServingUnit",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteFood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetCalories" DOUBLE PRECISION NOT NULL DEFAULT 2000,
    "targetProtein" DOUBLE PRECISION NOT NULL DEFAULT 150,
    "targetCarbs" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "targetFat" DOUBLE PRECISION NOT NULL DEFAULT 65,
    "targetFiber" DOUBLE PRECISION,
    "targetSodium" DOUBLE PRECISION,
    "targetSugar" DOUBLE PRECISION,
    "breakfastPercent" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "lunchPercent" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "dinnerPercent" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "snacksPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FaqCategory_name_key" ON "FaqCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FaqCategory_slug_key" ON "FaqCategory"("slug");

-- CreateIndex
CREATE INDEX "FaqCategory_slug_idx" ON "FaqCategory"("slug");

-- CreateIndex
CREATE INDEX "FaqCategory_isActive_order_idx" ON "FaqCategory"("isActive", "order");

-- CreateIndex
CREATE INDEX "Faq_categoryId_idx" ON "Faq"("categoryId");

-- CreateIndex
CREATE INDEX "Faq_isActive_order_idx" ON "Faq"("isActive", "order");

-- CreateIndex
CREATE INDEX "Faq_isFeatured_idx" ON "Faq"("isFeatured");

-- CreateIndex
CREATE UNIQUE INDEX "Food_barcode_key" ON "Food"("barcode");

-- CreateIndex
CREATE INDEX "Food_name_idx" ON "Food"("name");

-- CreateIndex
CREATE INDEX "Food_barcode_idx" ON "Food"("barcode");

-- CreateIndex
CREATE INDEX "Food_brand_idx" ON "Food"("brand");

-- CreateIndex
CREATE INDEX "Food_source_idx" ON "Food"("source");

-- CreateIndex
CREATE INDEX "Food_createdById_idx" ON "Food"("createdById");

-- CreateIndex
CREATE INDEX "Food_isVerified_idx" ON "Food"("isVerified");

-- CreateIndex
CREATE INDEX "FoodServing_foodId_idx" ON "FoodServing"("foodId");

-- CreateIndex
CREATE INDEX "FoodLog_userId_idx" ON "FoodLog"("userId");

-- CreateIndex
CREATE INDEX "FoodLog_userId_loggedAt_idx" ON "FoodLog"("userId", "loggedAt");

-- CreateIndex
CREATE INDEX "FoodLog_loggedAt_idx" ON "FoodLog"("loggedAt");

-- CreateIndex
CREATE INDEX "FoodLog_mealType_idx" ON "FoodLog"("mealType");

-- CreateIndex
CREATE INDEX "FoodLog_foodId_idx" ON "FoodLog"("foodId");

-- CreateIndex
CREATE INDEX "UserFavoriteFood_userId_idx" ON "UserFavoriteFood"("userId");

-- CreateIndex
CREATE INDEX "UserFavoriteFood_foodId_idx" ON "UserFavoriteFood"("foodId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavoriteFood_userId_foodId_key" ON "UserFavoriteFood"("userId", "foodId");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionGoal_userId_key" ON "NutritionGoal"("userId");

-- AddForeignKey
ALTER TABLE "Faq" ADD CONSTRAINT "Faq_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FaqCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Food" ADD CONSTRAINT "Food_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodServing" ADD CONSTRAINT "FoodServing_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLog" ADD CONSTRAINT "FoodLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLog" ADD CONSTRAINT "FoodLog_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteFood" ADD CONSTRAINT "UserFavoriteFood_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteFood" ADD CONSTRAINT "UserFavoriteFood_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionGoal" ADD CONSTRAINT "NutritionGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
