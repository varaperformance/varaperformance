-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "auditMetaAuthTag" BYTEA,
ADD COLUMN     "auditMetaIv" BYTEA,
ADD COLUMN     "auditMetaWrappedKey" BYTEA,
ADD COLUMN     "eAuditMeta" BYTEA;

-- AlterTable
ALTER TABLE "ClimbEntry" ADD COLUMN     "climbContentAuthTag" BYTEA,
ADD COLUMN     "climbContentIv" BYTEA,
ADD COLUMN     "climbContentWrappedKey" BYTEA,
ADD COLUMN     "eClimbContent" BYTEA;

-- AlterTable
ALTER TABLE "Consent" ADD COLUMN     "consentMetaAuthTag" BYTEA,
ADD COLUMN     "consentMetaIv" BYTEA,
ADD COLUMN     "consentMetaWrappedKey" BYTEA,
ADD COLUMN     "eConsentMeta" BYTEA;

-- AlterTable
ALTER TABLE "ContractSignature" ADD COLUMN     "eSignatureMeta" BYTEA,
ADD COLUMN     "signatureMetaAuthTag" BYTEA,
ADD COLUMN     "signatureMetaIv" BYTEA,
ADD COLUMN     "signatureMetaWrappedKey" BYTEA;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "eLastMessage" BYTEA,
ADD COLUMN     "lastMessageAuthTag" BYTEA,
ADD COLUMN     "lastMessageIv" BYTEA,
ADD COLUMN     "lastMessageWrappedKey" BYTEA;

-- AlterTable
ALTER TABLE "FoodLog" ADD COLUMN     "eFoodDetails" BYTEA,
ADD COLUMN     "foodDetailsAuthTag" BYTEA,
ADD COLUMN     "foodDetailsIv" BYTEA,
ADD COLUMN     "foodDetailsWrappedKey" BYTEA;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "eNotification" BYTEA,
ADD COLUMN     "notificationAuthTag" BYTEA,
ADD COLUMN     "notificationIv" BYTEA,
ADD COLUMN     "notificationWrappedKey" BYTEA;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "eSessionMeta" BYTEA,
ADD COLUMN     "sessionMetaAuthTag" BYTEA,
ADD COLUMN     "sessionMetaIv" BYTEA,
ADD COLUMN     "sessionMetaWrappedKey" BYTEA;

-- AlterTable
ALTER TABLE "ShopOrder" ADD COLUMN     "eEmail" BYTEA,
ADD COLUMN     "emailAuthTag" BYTEA,
ADD COLUMN     "emailIv" BYTEA,
ADD COLUMN     "emailWrappedKey" BYTEA;

-- AlterTable
ALTER TABLE "StackItem" ADD COLUMN     "eStackItem" BYTEA,
ADD COLUMN     "stackItemAuthTag" BYTEA,
ADD COLUMN     "stackItemIv" BYTEA,
ADD COLUMN     "stackItemWrappedKey" BYTEA;
