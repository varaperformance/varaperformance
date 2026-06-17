-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordResetCode" CHAR(6),
ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3),
ALTER COLUMN "isActive" SET DEFAULT false;

-- CreateTable
CREATE TABLE "Gym" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "zipCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "gymId" TEXT NOT NULL,

    CONSTRAINT "GymLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GymToProfile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GymToProfile_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Gym_name_idx" ON "Gym"("name");

-- CreateIndex
CREATE INDEX "GymLocation_gymId_idx" ON "GymLocation"("gymId");

-- CreateIndex
CREATE INDEX "GymLocation_city_country_idx" ON "GymLocation"("city", "country");

-- CreateIndex
CREATE INDEX "_GymToProfile_B_index" ON "_GymToProfile"("B");

-- AddForeignKey
ALTER TABLE "GymLocation" ADD CONSTRAINT "GymLocation_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GymToProfile" ADD CONSTRAINT "_GymToProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GymToProfile" ADD CONSTRAINT "_GymToProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
