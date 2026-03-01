-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'DISMISSED');

-- CreateEnum
CREATE TYPE "StartupStage" AS ENUM ('IDEA', 'PRE_SEED', 'SEED', 'GROWTH', 'SME');

-- CreateEnum
CREATE TYPE "PrimaryGoal" AS ENUM ('RAISE', 'SURVIVE', 'PROFIT', 'SCALE');

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "headcount" INTEGER NOT NULL DEFAULT 0,
    "monthlySalary" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "saasSpend" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "marketingSpend" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "monthlyRevenue" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "currentCash" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "projectedBurn" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "projectedRunway" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "assignee" TEXT NOT NULL DEFAULT 'FOUNDER',
    "status" "ActionStatus" NOT NULL DEFAULT 'OPEN',
    "expectedImpact" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "actualImpact" DECIMAL(20,2),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "sourceInsight" TEXT,
    "sourceMetric" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StartupProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "stage" "StartupStage" NOT NULL,
    "monthlyRevenue" DECIMAL(20,2) NOT NULL,
    "monthlyExpenses" DECIMAL(20,2) NOT NULL,
    "cashInBank" DECIMAL(20,2) NOT NULL,
    "teamSize" INTEGER NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "industry" TEXT NOT NULL,
    "primaryGoal" "PrimaryGoal" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StartupProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfoDecision" (
    "id" TEXT NOT NULL,
    "startupProfileId" TEXT NOT NULL,
    "decisionType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "facts" JSONB NOT NULL,
    "recommendedActions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CfoDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiExplanation" (
    "id" TEXT NOT NULL,
    "cfoDecisionId" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Scenario_organizationId_idx" ON "Scenario"("organizationId");

-- CreateIndex
CREATE INDEX "ActionItem_organizationId_idx" ON "ActionItem"("organizationId");

-- CreateIndex
CREATE INDEX "ActionItem_status_idx" ON "ActionItem"("status");

-- CreateIndex
CREATE INDEX "ActionItem_assignee_idx" ON "ActionItem"("assignee");

-- CreateIndex
CREATE UNIQUE INDEX "StartupProfile_userId_key" ON "StartupProfile"("userId");

-- CreateIndex
CREATE INDEX "StartupProfile_organizationId_idx" ON "StartupProfile"("organizationId");

-- CreateIndex
CREATE INDEX "CfoDecision_startupProfileId_idx" ON "CfoDecision"("startupProfileId");

-- CreateIndex
CREATE INDEX "CfoDecision_createdAt_idx" ON "CfoDecision"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiExplanation_cfoDecisionId_key" ON "AiExplanation"("cfoDecisionId");

-- AddForeignKey
ALTER TABLE "CfoDecision" ADD CONSTRAINT "CfoDecision_startupProfileId_fkey" FOREIGN KEY ("startupProfileId") REFERENCES "StartupProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiExplanation" ADD CONSTRAINT "AiExplanation_cfoDecisionId_fkey" FOREIGN KEY ("cfoDecisionId") REFERENCES "CfoDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
