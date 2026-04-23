/**
 * Pre-Decision Guard Engine
 * Deterministic evaluation of financial consequences.
 * Implementation follows behavioral product principles: Loss framing, Anchoring, and Risk escalation.
 */

export interface SimulationInput {
    revenueChange?: number; // Absolute increase/decrease
    costChange?: number;    // Absolute increase/decrease
    hiringImpact?: number;  // Estimated salary costs added
    oneTimeExpense?: number;
}

export interface CurrentState {
    cashBalance: number;
    monthlyBurn: number;
    monthlyRevenue: number;
    runwayMonths: number;
}

export interface GuardEvaluation {
    runwayBefore: number;
    runwayAfter: number;
    runwayDelta: number;

    burnBefore: number;
    burnAfter: number;
    burnDelta: number;

    zeroCashDateBefore: Date;
    zeroCashDateAfter: Date;
    zeroDateShiftDays: number;

    riskLevel: "SAFE" | "WATCH" | "DANGER";

    warnings: string[];
    insights: string[];
    suggestions: string[];
}

/**
 * High-speed deterministic impact evaluation.
 * No API roundtip required for simulation updates.
 */
export function evaluateDecisionImpact(input: SimulationInput, current: CurrentState): GuardEvaluation {
    const burnBefore = Math.max(0, current.monthlyBurn);
    const runwayBefore = Math.max(0, current.runwayMonths);
    const now = new Date();

    // 1. Calculate Burn After
    // Cost impact: positive costChange = higher burn, positive hiringImpact = higher burn
    // Revenue impact: positive revenueChange = lower burn
    const revImpact = input.revenueChange || 0;
    const costImpact = (input.costChange || 0) + (input.hiringImpact || 0);
    
    const burnAfter = Math.max(0, burnBefore + costImpact - revImpact);
    const burnDelta = burnAfter - burnBefore;

    // 2. Calculate Runway After (Months)
    // Adjust cash for one-time expenses first
    const effectiveCash = Math.max(0, current.cashBalance - (input.oneTimeExpense || 0));
    
    let runwayAfter: number;
    if (burnAfter <= 0) {
        // Cash-flow positive or neutral
        runwayAfter = effectiveCash > 0 ? 120 : 0; // Cap at 120 months for "Infinite" state
    } else {
        runwayAfter = effectiveCash / burnAfter;
    }
    
    const runwayDelta = runwayAfter - runwayBefore;

    // 3. Zero Cash Dates (using average 30.44 days per month)
    const DAYS_IN_MONTH = 30.44;
    const zeroCashDateBefore = new Date(now.getTime() + runwayBefore * DAYS_IN_MONTH * 24 * 60 * 60 * 1000);
    const zeroCashDateAfter = new Date(now.getTime() + runwayAfter * DAYS_IN_MONTH * 24 * 60 * 60 * 1000);
    
    // Shift is positive if date moves EARLIER (losing time)
    const zeroDateShiftDays = Math.round((zeroCashDateBefore.getTime() - zeroCashDateAfter.getTime()) / (1000 * 60 * 60 * 24));

    // 4. RISK CLASSIFICATION LOGIC
    let riskLevel: "SAFE" | "WATCH" | "DANGER" = "SAFE";
    const runwayDropPct = runwayBefore > 0 ? ((runwayBefore - runwayAfter) / runwayBefore) * 100 : 0;

    if (runwayAfter < 6 || runwayDropPct > 15 || zeroDateShiftDays > 10) {
        riskLevel = "DANGER";
    } else if (runwayAfter < 12 || runwayDelta < 0) {
        riskLevel = "WATCH";
    }

    // 5. BEHAVIORAL INSIGHTS & LOSS FRAMING
    const warnings: string[] = [];
    const insights: string[] = [];
    const suggestions: string[] = [];

    const formatINR = (val: number) => {
        const absVal = Math.abs(val);
        if (absVal >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
        return `₹${Math.round(val).toLocaleString('en-IN')}`;
    };

    if (burnDelta > 0) {
        insights.push(`Your monthly burn increases by ${formatINR(burnDelta)}.`);
        if (riskLevel === "DANGER") {
            warnings.push(`You lose ${Math.abs(runwayDelta).toFixed(1)} months of survival.`);
            warnings.push(`Danger zone entered ${zeroDateShiftDays} days earlier.`);
            suggestions.push(`Offset this by generating ${formatINR(burnDelta)} in additional monthly revenue.`);
        }
    } else if (burnDelta < 0) {
        insights.push(`Runway efficiency improved by ${Math.abs(runwayDelta).toFixed(1)} months.`);
    }

    if (input.oneTimeExpense && input.oneTimeExpense > current.cashBalance * 0.1) {
        warnings.push(`Critical: One-time outflow represents ${Math.round((input.oneTimeExpense / current.cashBalance) * 100)}% of total cash.`);
    }

    if (runwayAfter < 3) {
        warnings.push("SURVIVAL AT RISK: Runway below 3-month operational threshold.");
    }

    return {
        runwayBefore,
        runwayAfter,
        runwayDelta,
        burnBefore,
        burnAfter,
        burnDelta,
        zeroCashDateBefore,
        zeroCashDateAfter,
        zeroDateShiftDays,
        riskLevel,
        warnings,
        insights,
        suggestions
    };
}
