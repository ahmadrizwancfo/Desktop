-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('IN_APP', 'EMAIL', 'WHATSAPP', 'SLACK');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "FinancialSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revenue" DECIMAL(20,2) NOT NULL,
    "expenses" DECIMAL(20,2) NOT NULL,
    "cashBalance" DECIMAL(20,2) NOT NULL,
    "burn" DECIMAL(20,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyBrief" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "summaryText" TEXT NOT NULL,
    "topRisk" TEXT NOT NULL,
    "topRecommendation" TEXT NOT NULL,
    "metricsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "decisionId" TEXT,
    "alertType" TEXT NOT NULL,
    "channel" "AlertChannel" NOT NULL DEFAULT 'IN_APP',
    "status" "AlertStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialSnapshot_organizationId_snapshotDate_idx" ON "FinancialSnapshot"("organizationId", "snapshotDate");

-- CreateIndex
CREATE INDEX "FinancialSnapshot_userId_idx" ON "FinancialSnapshot"("userId");

-- CreateIndex
CREATE INDEX "WeeklyBrief_userId_weekStart_idx" ON "WeeklyBrief"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "WeeklyBrief_organizationId_idx" ON "WeeklyBrief"("organizationId");

-- CreateIndex
CREATE INDEX "Alert_userId_alertType_sentAt_idx" ON "Alert"("userId", "alertType", "sentAt");

-- CreateIndex
CREATE INDEX "Alert_decisionId_idx" ON "Alert"("decisionId");

-- CreateIndex
CREATE INDEX "Alert_organizationId_idx" ON "Alert"("organizationId");

-- AddForeignKey
ALTER TABLE "FinancialSnapshot" ADD CONSTRAINT "FinancialSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
