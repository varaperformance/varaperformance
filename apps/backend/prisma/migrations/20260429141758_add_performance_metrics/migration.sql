-- CreateTable
CREATE TABLE "performance_metrics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "rating" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "connection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performance_metrics_userId_idx" ON "performance_metrics"("userId");

-- CreateIndex
CREATE INDEX "performance_metrics_metricName_idx" ON "performance_metrics"("metricName");

-- CreateIndex
CREATE INDEX "performance_metrics_createdAt_idx" ON "performance_metrics"("createdAt");
