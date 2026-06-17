-- CreateTable
CREATE TABLE "lifestyle_goals" (
	"id" TEXT NOT NULL,
	"userId" TEXT NOT NULL,
	"sleepHours" DOUBLE PRECISION NOT NULL DEFAULT 8,
	"dailySteps" INTEGER NOT NULL DEFAULT 10000,
	"adherenceTarget" INTEGER NOT NULL DEFAULT 85,
	"checkInsPerWeek" INTEGER NOT NULL DEFAULT 4,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "lifestyle_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lifestyle_goals_userId_key" ON "lifestyle_goals"("userId");

-- AddForeignKey
ALTER TABLE "lifestyle_goals" ADD CONSTRAINT "lifestyle_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
