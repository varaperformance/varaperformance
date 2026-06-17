-- CreateEnum
CREATE TYPE "GroceryListStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "GroceryList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "status" "GroceryListStatus" NOT NULL DEFAULT 'ACTIVE',
    "mealPlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroceryList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroceryListItem" (
    "id" TEXT NOT NULL,
    "groceryListId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "quantity" DOUBLE PRECISION,
    "unit" VARCHAR(50),
    "category" VARCHAR(60) NOT NULL DEFAULT 'General',
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "note" VARCHAR(255),
    "foodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroceryListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroceryList_userId_idx" ON "GroceryList"("userId");

-- CreateIndex
CREATE INDEX "GroceryList_userId_status_idx" ON "GroceryList"("userId", "status");

-- CreateIndex
CREATE INDEX "GroceryList_mealPlanId_idx" ON "GroceryList"("mealPlanId");

-- CreateIndex
CREATE INDEX "GroceryListItem_groceryListId_idx" ON "GroceryListItem"("groceryListId");

-- CreateIndex
CREATE INDEX "GroceryListItem_groceryListId_isChecked_idx" ON "GroceryListItem"("groceryListId", "isChecked");

-- CreateIndex
CREATE INDEX "GroceryListItem_foodId_idx" ON "GroceryListItem"("foodId");

-- AddForeignKey
ALTER TABLE "GroceryList" ADD CONSTRAINT "GroceryList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroceryList" ADD CONSTRAINT "GroceryList_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroceryListItem" ADD CONSTRAINT "GroceryListItem_groceryListId_fkey" FOREIGN KEY ("groceryListId") REFERENCES "GroceryList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroceryListItem" ADD CONSTRAINT "GroceryListItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;
