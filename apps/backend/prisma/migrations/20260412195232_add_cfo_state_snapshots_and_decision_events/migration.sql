-- CreateTable
CREATE TABLE "CfoStateSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "companyStatus" TEXT NOT NULL,
    "runwayMonths" DOUBLE PRECISION NOT NULL,
    "daysLeft" INTEGER,
    "cashInBank" DOUBLE PRECISION NOT NULL,
    "monthlyRevenue" DOUBLE PRECISION NOT NULL,
    "monthlyExpenses" DOUBLE PRECISION NOT NULL,
    "netBurn" DOUBLE PRECISION NOT NULL,
    "burnTrend" TEXT NOT NULL,
    "revenueTrend" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "dataQuality" TEXT NOT NULL,
    "totalReceivables" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runwayChangeDays" INTEGER,
    "burnChangePercent" DOUBLE PRECISION,
    "cashChangeAmount" DOUBLE PRECISION,
    "riskChanged" BOOLEAN NOT NULL DEFAULT false,
    "statusChanged" BOOLEAN NOT NULL DEFAULT false,
    "fullState" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CfoStateSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CfoDecisionEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "decisionStatement" TEXT NOT NULL,
    "optionChosen" TEXT,
    "firstShownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastShownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clickedAt" TIMESTAMP(3),
    "actedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acted" BOOLEAN NOT NULL DEFAULT false,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT,
    "runwayAtShown" DOUBLE PRECISION,
    "runwayAtResolved" DOUBLE PRECISION,
    "runwayDelta" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CfoDecisionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CfoStateSnapshot_organizationId_generatedAt_idx" ON "CfoStateSnapshot"("organizationId", "generatedAt");

-- CreateIndex
CREATE INDEX "CfoStateSnapshot_organizationId_idx" ON "CfoStateSnapshot"("organizationId");

-- CreateIndex
CREATE INDEX "CfoDecisionEvent_organizationId_resolved_idx" ON "CfoDecisionEvent"("organizationId", "resolved");

-- CreateIndex
CREATE INDEX "CfoDecisionEvent_organizationId_createdAt_idx" ON "CfoDecisionEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CfoDecisionEvent_organizationId_decisionId_key" ON "CfoDecisionEvent"("organizationId", "decisionId");

-- AddForeignKey
ALTER TABLE "CfoStateSnapshot" ADD CONSTRAINT "CfoStateSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CfoDecisionEvent" ADD CONSTRAINT "CfoDecisionEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
