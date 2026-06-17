-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totpRecoveryAuthTag" BYTEA,
ADD COLUMN     "totpRecoveryCodes" BYTEA,
ADD COLUMN     "totpRecoveryIv" BYTEA,
ADD COLUMN     "totpRecoveryWrappedKey" BYTEA,
ADD COLUMN     "totpSecret" BYTEA,
ADD COLUMN     "totpSecretAuthTag" BYTEA,
ADD COLUMN     "totpSecretIv" BYTEA,
ADD COLUMN     "totpSecretWrappedKey" BYTEA,
ADD COLUMN     "totpVerifiedAt" TIMESTAMP(3);
