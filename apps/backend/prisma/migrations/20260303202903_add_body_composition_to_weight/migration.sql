-- AlterTable
ALTER TABLE "WeightLog" ADD COLUMN     "bodyFatAuthTag" BYTEA,
ADD COLUMN     "bodyFatIv" BYTEA,
ADD COLUMN     "bodyFatWrappedKey" BYTEA,
ADD COLUMN     "encryptedBodyFat" BYTEA,
ADD COLUMN     "encryptedMuscleMass" BYTEA,
ADD COLUMN     "muscleMassAuthTag" BYTEA,
ADD COLUMN     "muscleMassIv" BYTEA,
ADD COLUMN     "muscleMassWrappedKey" BYTEA;
