-- Recipes held no user data and are rebuilt from the starter catalogue at startup.
DELETE FROM "Recipe";

ALTER TABLE "Recipe"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "servings" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "difficulty" TEXT NOT NULL DEFAULT 'Легко',
  ADD COLUMN "steps" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE UNIQUE INDEX "Recipe_slug_key" ON "Recipe"("slug");

ALTER TABLE "RecipeItem" DROP CONSTRAINT "RecipeItem_productId_fkey";

ALTER TABLE "RecipeItem"
  DROP COLUMN "quantity",
  ALTER COLUMN "productId" DROP NOT NULL,
  ADD COLUMN "name" TEXT NOT NULL,
  ADD COLUMN "amount" DOUBLE PRECISION NOT NULL,
  ADD COLUMN "unit" TEXT NOT NULL,
  ADD COLUMN "optional" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "includeTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "excludeTerms" TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "RecipeItem"
  ADD CONSTRAINT "RecipeItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
