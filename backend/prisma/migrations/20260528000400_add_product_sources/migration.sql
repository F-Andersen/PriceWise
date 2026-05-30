CREATE TABLE "ProductSource" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,

    CONSTRAINT "ProductSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductSource_sourceUrl_key" ON "ProductSource"("sourceUrl");
CREATE UNIQUE INDEX "ProductSource_productId_storeId_key" ON "ProductSource"("productId", "storeId");
CREATE INDEX "ProductSource_storeId_idx" ON "ProductSource"("storeId");

ALTER TABLE "ProductSource" ADD CONSTRAINT "ProductSource_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductSource" ADD CONSTRAINT "ProductSource_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
