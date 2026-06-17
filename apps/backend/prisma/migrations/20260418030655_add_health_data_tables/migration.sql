-- CreateTable
CREATE TABLE "step_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "steps" INTEGER NOT NULL,
    "source" "WorkoutSessionSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "step_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sleep_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "source" "WorkoutSessionSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sleep_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "heart_rate_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "bpm" INTEGER NOT NULL,
    "source" "WorkoutSessionSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "heart_rate_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_sync_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "source" "WorkoutSessionSource" NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "syncCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "health_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "step_logs_userId_date_idx" ON "step_logs"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "step_logs_userId_date_source_key" ON "step_logs"("userId", "date", "source");

-- CreateIndex
CREATE INDEX "sleep_logs_userId_date_idx" ON "sleep_logs"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "sleep_logs_userId_date_source_key" ON "sleep_logs"("userId", "date", "source");

-- CreateIndex
CREATE INDEX "heart_rate_logs_userId_timestamp_idx" ON "heart_rate_logs"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "health_sync_logs_userId_idx" ON "health_sync_logs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "health_sync_logs_userId_dataType_source_key" ON "health_sync_logs"("userId", "dataType", "source");

-- AddForeignKey
ALTER TABLE "step_logs" ADD CONSTRAINT "step_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sleep_logs" ADD CONSTRAINT "sleep_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heart_rate_logs" ADD CONSTRAINT "heart_rate_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_sync_logs" ADD CONSTRAINT "health_sync_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
