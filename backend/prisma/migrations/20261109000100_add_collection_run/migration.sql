CREATE TABLE "CollectionRun" (
    "id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "productsChecked" INTEGER NOT NULL DEFAULT 0,
    "pricesRecorded" INTEGER NOT NULL DEFAULT 0,
    "issuesCount" INTEGER NOT NULL DEFAULT 0,
    "stores" JSONB,
    "issues" JSONB,
    "error" TEXT,

    CONSTRAINT "CollectionRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CollectionRun_startedAt_idx" ON "CollectionRun"("startedAt");
