/*
  Warnings:

  - A unique constraint covering the columns `[googleId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleId" TEXT;

-- CreateTable
CREATE TABLE "FinancialMetrics" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "period" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "sourceFile" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "totalAssets" DECIMAL(20,2),
    "totalLiabilities" DECIMAL(20,2),
    "totalEquity" DECIMAL(20,2),
    "currentAssets" DECIMAL(20,2),
    "currentLiabilities" DECIMAL(20,2),
    "currentRatio" DECIMAL(10,4),
    "debtToEquity" DECIMAL(10,4),
    "revenue" DECIMAL(20,2),
    "totalExpenses" DECIMAL(20,2),
    "netProfit" DECIMAL(20,2),
    "grossProfit" DECIMAL(20,2),
    "ebitda" DECIMAL(20,2),
    "profitMargin" DECIMAL(10,4),
    "operatingCashFlow" DECIMAL(20,2),
    "investingCashFlow" DECIMAL(20,2),
    "financingCashFlow" DECIMAL(20,2),
    "netCashFlow" DECIMAL(20,2),
    "monthlyBurn" DECIMAL(20,2),
    "cashRunway" INTEGER,
    "openingBalance" DECIMAL(20,2),
    "closingBalance" DECIMAL(20,2),
    "totalCredits" DECIMAL(20,2),
    "totalDebits" DECIMAL(20,2),
    "gstLiability" DECIMAL(20,2),
    "inputTaxCredit" DECIMAL(20,2),
    "netGstPayable" DECIMAL(20,2),
    "totalInvoiceValue" DECIMAL(20,2),
    "pendingReceivables" DECIMAL(20,2),
    "extractedFields" TEXT[],
    "warnings" TEXT[],
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceItem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(20,2),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialMetrics_organizationId_idx" ON "FinancialMetrics"("organizationId");

-- CreateIndex
CREATE INDEX "FinancialMetrics_uploadedAt_idx" ON "FinancialMetrics"("uploadedAt");

-- CreateIndex
CREATE INDEX "AiUsage_organizationId_idx" ON "AiUsage"("organizationId");

-- CreateIndex
CREATE INDEX "AiUsage_timestamp_idx" ON "AiUsage"("timestamp");

-- CreateIndex
CREATE INDEX "AiUsage_endpoint_idx" ON "AiUsage"("endpoint");

-- CreateIndex
CREATE INDEX "ComplianceItem_organizationId_idx" ON "ComplianceItem"("organizationId");

-- CreateIndex
CREATE INDEX "ComplianceItem_dueDate_idx" ON "ComplianceItem"("dueDate");

-- CreateIndex
CREATE INDEX "ComplianceItem_status_idx" ON "ComplianceItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- AddForeignKey
ALTER TABLE "FinancialMetrics" ADD CONSTRAINT "FinancialMetrics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
