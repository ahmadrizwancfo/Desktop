/*
  Warnings:

  - The `assignee` column on the `ActionItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `explanation` on the `AiExplanation` table. All the data in the column will be lost.
  - You are about to drop the column `model` on the `AiExplanation` table. All the data in the column will be lost.
  - The `severity` column on the `ComplianceItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `ComplianceItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `explanationText` to the `AiExplanation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `modelUsed` to the `AiExplanation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tone` to the `AiExplanation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `decisionDomain` to the `CfoDecision` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CfoDecision` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `recommendedActions` on the `CfoDecision` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `ComplianceItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ComplianceType" AS ENUM ('GST', 'TDS', 'ROC', 'PF_ESI', 'ADVANCE_TAX', 'MCA', 'IT_RETURN');

-- CreateEnum
CREATE TYPE "ComplianceSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('PENDING', 'COMPLETED', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "Assignee" AS ENUM ('FOUNDER', 'OPS', 'ACCOUNTANT', 'FINANCE');

-- CreateEnum
CREATE TYPE "DecisionDomain" AS ENUM ('SURVIVAL', 'EFFICIENCY', 'GROWTH', 'HIRING', 'FUNDRAISING', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "FundingRoundType" AS ENUM ('BOOTSTRAPPED', 'ANGEL', 'PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'BRIDGE', 'GRANT', 'REVENUE_BASED');

-- CreateEnum
CREATE TYPE "FundingRoundStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'CLOSED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ExpenseFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- ⚠️  DEV DATA CLEANUP
-- Clear tables with breaking column changes. CASCADE handles FK children automatically.
-- Safe for dev: these are test rows only.
TRUNCATE TABLE "AiExplanation" CASCADE;
TRUNCATE TABLE "CfoDecision" CASCADE;
TRUNCATE TABLE "ComplianceItem" CASCADE;

-- DropIndex
DROP INDEX "ActionItem_assignee_idx";

-- DropIndex
DROP INDEX "ActionItem_organizationId_idx";

-- DropIndex
DROP INDEX "ActionItem_status_idx";

-- DropIndex
DROP INDEX "CfoDecision_startupProfileId_idx";

-- DropIndex
DROP INDEX "ComplianceItem_organizationId_idx";

-- AlterTable
ALTER TABLE "ActionItem" DROP COLUMN "assignee",
ADD COLUMN     "assignee" "Assignee" NOT NULL DEFAULT 'FOUNDER';

-- AlterTable
ALTER TABLE "AiExplanation" DROP COLUMN "explanation",
DROP COLUMN "model",
ADD COLUMN     "explanationText" TEXT NOT NULL,
ADD COLUMN     "modelUsed" TEXT NOT NULL,
ADD COLUMN     "tone" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CfoDecision" ADD COLUMN     "decisionDomain" "DecisionDomain" NOT NULL,
ADD COLUMN     "status" "DecisionStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "recommendedActions",
ADD COLUMN     "recommendedActions" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "ComplianceItem" DROP COLUMN "type",
ADD COLUMN     "type" "ComplianceType" NOT NULL,
DROP COLUMN "severity",
ADD COLUMN     "severity" "ComplianceSeverity" NOT NULL DEFAULT 'MEDIUM',
DROP COLUMN "status",
ADD COLUMN     "status" "ComplianceStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN     "monthlyProjections" JSONB;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StartupProfileSnapshot" (
    "id" TEXT NOT NULL,
    "startupProfileId" TEXT NOT NULL,
    "stage" "StartupStage" NOT NULL,
    "monthlyRevenue" DECIMAL(20,2) NOT NULL,
    "monthlyExpenses" DECIMAL(20,2) NOT NULL,
    "cashInBank" DECIMAL(20,2) NOT NULL,
    "teamSize" INTEGER NOT NULL,
    "primaryGoal" "PrimaryGoal" NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StartupProfileSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "plannedAmount" DECIMAL(20,2) NOT NULL,
    "actualAmount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingRound" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "roundType" "FundingRoundType" NOT NULL,
    "targetAmount" DECIMAL(20,2) NOT NULL,
    "raisedAmount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "valuation" DECIMAL(20,2),
    "dilution" DECIMAL(5,4),
    "status" "FundingRoundStatus" NOT NULL DEFAULT 'PLANNING',
    "leadInvestor" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FundingRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "value" DECIMAL(20,4) NOT NULL,
    "unit" TEXT,
    "period" TEXT NOT NULL,
    "source" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExpense" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "amount" DECIMAL(20,2) NOT NULL,
    "frequency" "ExpenseFrequency" NOT NULL DEFAULT 'MONTHLY',
    "category" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "model" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StartupProfileSnapshot_startupProfileId_idx" ON "StartupProfileSnapshot"("startupProfileId");

-- CreateIndex
CREATE INDEX "StartupProfileSnapshot_snapshotAt_idx" ON "StartupProfileSnapshot"("snapshotAt");

-- CreateIndex
CREATE INDEX "Budget_organizationId_period_idx" ON "Budget"("organizationId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_organizationId_category_period_key" ON "Budget"("organizationId", "category", "period");

-- CreateIndex
CREATE INDEX "FundingRound_organizationId_idx" ON "FundingRound"("organizationId");

-- CreateIndex
CREATE INDEX "FundingRound_organizationId_status_idx" ON "FundingRound"("organizationId", "status");

-- CreateIndex
CREATE INDEX "MetricSnapshot_organizationId_metricKey_idx" ON "MetricSnapshot"("organizationId", "metricKey");

-- CreateIndex
CREATE INDEX "MetricSnapshot_organizationId_period_idx" ON "MetricSnapshot"("organizationId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "MetricSnapshot_organizationId_metricKey_period_key" ON "MetricSnapshot"("organizationId", "metricKey", "period");

-- CreateIndex
CREATE INDEX "RecurringExpense_organizationId_isActive_idx" ON "RecurringExpense"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "RecurringExpense_organizationId_category_idx" ON "RecurringExpense"("organizationId", "category");

-- CreateIndex
CREATE INDEX "ChatThread_organizationId_userId_idx" ON "ChatThread"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "ChatThread_updatedAt_idx" ON "ChatThread"("updatedAt");

-- CreateIndex
CREATE INDEX "ChatMessage_threadId_createdAt_idx" ON "ChatMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "ActionItem_organizationId_status_idx" ON "ActionItem"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ActionItem_organizationId_assignee_idx" ON "ActionItem"("organizationId", "assignee");

-- CreateIndex
CREATE INDEX "ActionItem_dueDate_idx" ON "ActionItem"("dueDate");

-- CreateIndex
CREATE INDEX "AiUsage_organizationId_timestamp_idx" ON "AiUsage"("organizationId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "BankAccount_organizationId_idx" ON "BankAccount"("organizationId");

-- CreateIndex
CREATE INDEX "BankAccount_organizationId_deletedAt_idx" ON "BankAccount"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "CfoDecision_startupProfileId_status_idx" ON "CfoDecision"("startupProfileId", "status");

-- CreateIndex
CREATE INDEX "CfoDecision_decisionDomain_idx" ON "CfoDecision"("decisionDomain");

-- CreateIndex
CREATE INDEX "ComplianceItem_organizationId_status_idx" ON "ComplianceItem"("organizationId", "status");

-- CreateIndex
CREATE INDEX "ComplianceItem_organizationId_dueDate_idx" ON "ComplianceItem"("organizationId", "dueDate");

-- CreateIndex
CREATE INDEX "ComplianceItem_status_idx" ON "ComplianceItem"("status");

-- CreateIndex
CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");

-- CreateIndex
CREATE INDEX "FinancialMetrics_organizationId_documentType_idx" ON "FinancialMetrics"("organizationId", "documentType");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_status_idx" ON "Invoice"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_dueDate_idx" ON "Invoice"("organizationId", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_deletedAt_idx" ON "Invoice"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Transaction_bankAccountId_date_idx" ON "Transaction"("bankAccountId", "date");

-- CreateIndex
CREATE INDEX "Transaction_bankAccountId_type_date_idx" ON "Transaction"("bankAccountId", "type", "date");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Vendor_organizationId_idx" ON "Vendor"("organizationId");

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceItem" ADD CONSTRAINT "ComplianceItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StartupProfile" ADD CONSTRAINT "StartupProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StartupProfile" ADD CONSTRAINT "StartupProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StartupProfileSnapshot" ADD CONSTRAINT "StartupProfileSnapshot_startupProfileId_fkey" FOREIGN KEY ("startupProfileId") REFERENCES "StartupProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingRound" ADD CONSTRAINT "FundingRound_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExpense" ADD CONSTRAINT "RecurringExpense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatThread" ADD CONSTRAINT "ChatThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
