import { Injectable } from '@nestjs/common';
import { FinancialReasoningInput, FinancialReasoningResult } from './interfaces/financial-reasoning.interface';

@Injectable()
export class FinancialReasoningEngine {
  /**
   * Deterministic Financial Reasoning Engine.
   * Pure deterministic explanation layer for FounderCFO without LLM dependency.
   */
  public generateReasoning(input: FinancialReasoningInput): FinancialReasoningResult {
    const nowIso = new Date().toISOString();

    // Scenario 1: Compliance Risk (GST Liability > Cash)
    if (input.financialState === 'COMPLIANCE_RISK_PERIOD') {
      const gst = input.gstPayable || 0;
      return {
        organizationId: input.organizationId,
        whatChanged: `Statutory GST liability (₹${gst.toLocaleString('en-IN')}) exceeds total liquid bank cash (₹${input.cashBalance.toLocaleString('en-IN')}).`,
        whyItChanged: 'Statutory GST collected from customers was consumed in operational cash flow rather than held in escrow.',
        primaryCause: 'Statutory cash isolation failure.',
        secondaryCauses: [
          'Lack of dedicated statutory tax reserve account',
          'Unmonitored net burn against tax collection timelines',
        ],
        nature: 'STRUCTURAL',
        riskIfIgnored: 'Impending statutory GST penalty, legal interest charges, and bank account freeze by tax authorities.',
        recommendedAction: 'Immediately allocate collected invoice funds to statutory GST escrow and settle GSTR-3B tax dues.',
        expectedOutcome: 'Restores statutory tax compliance and avoids penal interest of 18% p.a.',
        alternativeActions: [
          'Accelerate immediate invoice collections from high-value enterprise accounts',
          'Short-term promoter bridge loan to cover statutory tax shortfall',
        ],
        confidence: Math.round(input.confidenceScore * 100) / 100,
        evidence: [
          `Liquid Cash: ₹${input.cashBalance.toLocaleString('en-IN')}`,
          `GST Liability: ₹${input.gstPayable?.toLocaleString('en-IN')}`,
          `Runway: ${input.runwayDays} days`,
        ],
        temporal: input.temporal,
        generatedAt: nowIso,
      };
    }

    // Scenario 2: Critical Cash Constrained (Runway <= 30 Days)
    if (input.financialState === 'CRITICAL_CASH_CONSTRAINED' || input.runwayDays <= 30) {
      return {
        organizationId: input.organizationId,
        whatChanged: `Cash runway dropped to ${input.runwayDays} days (${input.runwayMonths.toFixed(1)} months).`,
        whyItChanged: `Monthly net burn of ₹${input.monthlyBurn.toLocaleString('en-IN')}/mo exceeds sustainable cash reserves (₹${input.cashBalance.toLocaleString('en-IN')}).`,
        primaryCause: 'Operating burn rate outstripping available cash reserves.',
        secondaryCauses: [
          input.topExpenseCategory ? `High expenditure in ${input.topExpenseCategory}` : 'Uncurbed headcount or vendor expansion',
          'Delayed customer payments / high Days Sales Outstanding (DSO)',
        ],
        nature: 'STRUCTURAL',
        riskIfIgnored: 'Insolvency, payroll default, and operational shutdown within 30 days.',
        recommendedAction: 'Implement emergency survival mode: freeze non-essential vendor spend and defer non-critical hiring immediately.',
        expectedOutcome: 'Extends immediate runway by +45 days to allow emergency capital injection.',
        alternativeActions: [
          'Offer 5% prompt-payment discount on all open customer accounts receivable',
          'Renegotiate vendor payment terms from 15 days to 45 days',
        ],
        confidence: Math.round(input.confidenceScore * 100) / 100,
        evidence: [
          `Available Cash: ₹${input.cashBalance.toLocaleString('en-IN')}`,
          `Monthly Net Burn: ₹${input.monthlyBurn.toLocaleString('en-IN')}`,
          `Calculated Runway: ${input.runwayDays} days`,
        ],
        temporal: input.temporal,
        generatedAt: nowIso,
      };
    }

    // Scenario 3: Cash Constrained (Runway <= 90 Days)
    if (input.financialState === 'CASH_CONSTRAINED' || input.runwayDays <= 90) {
      return {
        organizationId: input.organizationId,
        whatChanged: `Cash runway stands at ${input.runwayDays} days (${input.runwayMonths.toFixed(1)} months), below the 90-day safe operational threshold.`,
        whyItChanged: `Net monthly burn (₹${input.monthlyBurn.toLocaleString('en-IN')}) requires active monitoring against primary intent: ${input.primaryIntent}.`,
        primaryCause: 'Elevated burn rate relative to cash runway buffer.',
        secondaryCauses: [
          'Sub-optimal SaaS or vendor contract terms',
          'Delayed receivables collection cycle',
        ],
        nature: 'STRUCTURAL',
        riskIfIgnored: 'Risk of forced emergency capital raise at unfavorable terms within 60 days.',
        recommendedAction: 'Execute targeted cost optimization: audit top 5 SaaS vendor tools and review marketing channel ROI.',
        expectedOutcome: 'Extends runway by +2.5 months back into safe 120-day zone.',
        alternativeActions: [
          'Freeze new discretionary hiring for Q3/Q4',
          'Rebalance marketing channels to focus strictly on positive ROI programs',
        ],
        confidence: Math.round(input.confidenceScore * 100) / 100,
        evidence: [
          `Current Cash: ₹${input.cashBalance.toLocaleString('en-IN')}`,
          `Monthly Burn: ₹${input.monthlyBurn.toLocaleString('en-IN')}`,
          `Target Runway: 120+ days`,
        ],
        temporal: input.temporal,
        generatedAt: nowIso,
      };
    }

    // Scenario 4: Expanding (Runway >= 365 Days)
    if (input.financialState === 'EXPANDING' || input.runwayDays >= 365) {
      return {
        organizationId: input.organizationId,
        whatChanged: `Cash reserves support an extended runway of ${input.runwayMonths.toFixed(1)} months (${input.runwayDays} days).`,
        whyItChanged: 'Low net burn or strong capital reserves provide significant operational flexibility.',
        primaryCause: 'Strong liquidity capital buffer.',
        secondaryCauses: [
          'High revenue growth trajectory',
          'Disciplined capital expenditure controls',
        ],
        nature: 'STRUCTURAL',
        riskIfIgnored: 'Opportunity cost of idle cash reserves underperforming inflation.',
        recommendedAction: 'Deploy capital strategically: invest in high-performing growth channels or treasury yield optimization.',
        expectedOutcome: 'Accelerates top-line growth while maintaining a 12-month safety buffer.',
        alternativeActions: [
          'Invest in key engineering or sales talent',
          'Place surplus cash in liquid treasury instruments to earn yield',
        ],
        confidence: Math.round(input.confidenceScore * 100) / 100,
        evidence: [
          `Cash Balance: ₹${input.cashBalance.toLocaleString('en-IN')}`,
          `Runway: ${input.runwayMonths.toFixed(1)} months`,
          `State: EXPANDING`,
        ],
        temporal: input.temporal,
        generatedAt: nowIso,
      };
    }

    // Scenario 5: Default Healthy
    return {
      organizationId: input.organizationId,
      whatChanged: 'Financial position is operating steadily within safe parameter bounds.',
      whyItChanged: `Current net burn (₹${input.monthlyBurn.toLocaleString('en-IN')}) is aligned with current cash reserves (₹${input.cashBalance.toLocaleString('en-IN')}).`,
      primaryCause: 'Controlled burn rate and adequate runway buffer.',
      secondaryCauses: [
        'Predictable cash inflow streams',
        'Stable operating expense baseline',
      ],
      nature: 'STRUCTURAL',
      riskIfIgnored: 'Low immediate operational risk; continue routine weekly monitoring.',
      recommendedAction: 'Maintain current financial discipline and track monthly budget vs actual variance.',
      expectedOutcome: 'Sustains steady operational baseline.',
      alternativeActions: [
        'Audit SaaS subscriptions quarterly for optimization opportunities',
      ],
      confidence: Math.round(input.confidenceScore * 100) / 100,
      evidence: [
        `Cash: ₹${input.cashBalance.toLocaleString('en-IN')}`,
        `Runway: ${input.runwayMonths.toFixed(1)} months`,
        `State: HEALTHY`,
      ],
      temporal: input.temporal,
      generatedAt: nowIso,
    };
  }
}
