CREATE TABLE "MatchCandidate" (
    "id" TEXT NOT NULL,
    "productAId" TEXT NOT NULL,
    "productBId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "MatchCandidate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchCandidate_productAId_productBId_key" ON "MatchCandidate"("productAId", "productBId");
CREATE INDEX "MatchCandidate_status_score_idx" ON "MatchCandidate"("status", "score");

ALTER TABLE "MatchCandidate" ADD CONSTRAINT "MatchCandidate_productAId_fkey" FOREIGN KEY ("productAId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchCandidate" ADD CONSTRAINT "MatchCandidate_productBId_fkey" FOREIGN KEY ("productBId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
