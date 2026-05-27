ALTER TABLE "Price" ADD COLUMN "imageUrl" TEXT;

UPDATE "Price" AS p
SET "imageUrl" =
  CASE
    WHEN s."name" ILIKE '%Novus%' THEN 'https://placehold.co/600x400/e7f7df/38a830?text='
    WHEN s."name" ILIKE '%Silpo%' OR s."name" ILIKE '%Сільпо%' THEN 'https://placehold.co/600x400/fff2dc/bf5f1b?text='
    ELSE 'https://placehold.co/600x400/eaf7ef/176d45?text='
  END || replace(s."name" || ' ' || pr."name", ' ', '%20')
FROM "Store" AS s, "Product" AS pr
WHERE p."storeId" = s."id" AND p."productId" = pr."id";
