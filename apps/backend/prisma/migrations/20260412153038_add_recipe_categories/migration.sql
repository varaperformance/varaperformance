-- CreateTable
CREATE TABLE "RecipeCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecipeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeCategoryOnRecipe" (
    "recipeId" TEXT NOT NULL,
    "recipeCategoryId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeCategoryOnRecipe_pkey" PRIMARY KEY ("recipeId","recipeCategoryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecipeCategory_name_key" ON "RecipeCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeCategory_slug_key" ON "RecipeCategory"("slug");

-- CreateIndex
CREATE INDEX "RecipeCategory_sortOrder_idx" ON "RecipeCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "RecipeCategoryOnRecipe_recipeCategoryId_idx" ON "RecipeCategoryOnRecipe"("recipeCategoryId");

-- AddForeignKey
ALTER TABLE "RecipeCategoryOnRecipe" ADD CONSTRAINT "RecipeCategoryOnRecipe_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeCategoryOnRecipe" ADD CONSTRAINT "RecipeCategoryOnRecipe_recipeCategoryId_fkey" FOREIGN KEY ("recipeCategoryId") REFERENCES "RecipeCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
