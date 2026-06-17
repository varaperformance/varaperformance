-- CreateTable
CREATE TABLE "SiteStat" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteStat_key_key" ON "SiteStat"("key");

-- CreateIndex
CREATE INDEX "SiteStat_key_idx" ON "SiteStat"("key");
