-- CreateTable
CREATE TABLE "InjectionProtocol" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedData" BYTEA NOT NULL,
    "dataIv" BYTEA NOT NULL,
    "dataAuthTag" BYTEA NOT NULL,
    "wrappedKey" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InjectionProtocol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InjectionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "protocolId" TEXT,
    "encryptedData" BYTEA NOT NULL,
    "dataIv" BYTEA NOT NULL,
    "dataAuthTag" BYTEA NOT NULL,
    "wrappedKey" BYTEA NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InjectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InjectionProtocol_userId_idx" ON "InjectionProtocol"("userId");

-- CreateIndex
CREATE INDEX "InjectionProtocol_userId_updatedAt_idx" ON "InjectionProtocol"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "InjectionLog_userId_idx" ON "InjectionLog"("userId");

-- CreateIndex
CREATE INDEX "InjectionLog_userId_loggedAt_idx" ON "InjectionLog"("userId", "loggedAt");

-- CreateIndex
CREATE INDEX "InjectionLog_protocolId_loggedAt_idx" ON "InjectionLog"("protocolId", "loggedAt");

-- AddForeignKey
ALTER TABLE "InjectionProtocol" ADD CONSTRAINT "InjectionProtocol_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InjectionLog" ADD CONSTRAINT "InjectionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InjectionLog" ADD CONSTRAINT "InjectionLog_protocolId_fkey" FOREIGN KEY ("protocolId") REFERENCES "InjectionProtocol"("id") ON DELETE SET NULL ON UPDATE CASCADE;
