-- A price row now covers a period: dateCollected = first seen, lastSeenAt = last
-- confirmed. Collections that find the same price extend lastSeenAt instead of
-- inserting a duplicate row.
ALTER TABLE "Price" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
UPDATE "Price" SET "lastSeenAt" = "dateCollected";
ALTER TABLE "Price" ALTER COLUMN "lastSeenAt" SET NOT NULL;
CREATE INDEX "Price_lastSeenAt_idx" ON "Price"("lastSeenAt");

-- Compact existing history: consecutive rows (per product and store) with the same
-- price, discount, promotion end and availability become one row spanning
-- from the first to the last of them.
WITH ordered AS (
  SELECT id, "productId", "storeId", "dateCollected",
    CASE WHEN
      price IS NOT DISTINCT FROM LAG(price) OVER w
      AND "oldPrice" IS NOT DISTINCT FROM LAG("oldPrice") OVER w
      AND "discountPrice" IS NOT DISTINCT FROM LAG("discountPrice") OVER w
      AND "promoEndsAt" IS NOT DISTINCT FROM LAG("promoEndsAt") OVER w
      AND "isAvailable" IS NOT DISTINCT FROM LAG("isAvailable") OVER w
    THEN 0 ELSE 1 END AS starts_run
  FROM "Price"
  WINDOW w AS (PARTITION BY "productId", "storeId" ORDER BY "dateCollected", id)
),
runs AS (
  SELECT id, "productId", "storeId", "dateCollected",
    SUM(starts_run) OVER (PARTITION BY "productId", "storeId" ORDER BY "dateCollected", id) AS run
  FROM ordered
),
spans AS (
  SELECT id, "dateCollected",
    FIRST_VALUE(id) OVER r AS keep_id,
    MAX("dateCollected") OVER (PARTITION BY "productId", "storeId", run) AS run_end
  FROM runs
  WINDOW r AS (PARTITION BY "productId", "storeId", run ORDER BY "dateCollected", id)
),
extended AS (
  UPDATE "Price" p SET "lastSeenAt" = s.run_end
  FROM spans s
  WHERE p.id = s.id AND s.id = s.keep_id
  RETURNING p.id
)
DELETE FROM "Price" p
USING spans s
WHERE p.id = s.id AND s.id <> s.keep_id;
