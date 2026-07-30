import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BusinessRule, RuleCategory } from '../domain/rule.types';

@Injectable()
export class RuleRegistryService implements OnModuleInit {
  private readonly logger = new Logger(RuleRegistryService.name);
  private readonly rulesMap = new Map<string, BusinessRule>();

  onModuleInit() {
    this.registerBuiltInRules();
    this.logger.log(`⚡ RuleRegistryService Initialized with ${this.rulesMap.size} active business rules.`);
  }

  /**
   * Register a new business rule dynamically into the registry.
   */
  registerRule(rule: BusinessRule): void {
    if (this.rulesMap.has(rule.ruleId)) {
      this.logger.warn(`Duplicate Rule Warning: Rule ID [${rule.ruleId}] already registered. Overwriting with new version.`);
    }
    this.rulesMap.set(rule.ruleId, rule);
    this.logger.log(`Registered Business Rule: [${rule.ruleId}] ${rule.ruleName} (Category: ${rule.category}, Severity: ${rule.severity})`);
  }

  /**
   * Retrieve all active enabled rules.
   */
  getActiveRules(): BusinessRule[] {
    return Array.from(this.rulesMap.values()).filter(r => r.enabled);
  }

  /**
   * Query rules by category.
   */
  getRulesByCategory(category: RuleCategory): BusinessRule[] {
    return this.getActiveRules().filter(r => r.category === category);
  }

  /**
   * Toggle rule status.
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rulesMap.get(ruleId);
    if (!rule) return false;
    rule.enabled = enabled;
    return true;
  }

  /**
   * Register core production deterministic business rules.
   */
  private registerBuiltInRules(): void {
    // 1. Critical Runway Rule
    this.registerRule({
      ruleId: 'RULE_RUNWAY_CRITICAL',
      ruleName: 'Critical Cash Runway Warning',
      category: 'RUNWAY',
      description: 'Triggered when runway falls below 3 months of net operating burn.',
      severity: 'CRITICAL',
      priority: 10,
      confidence: 1.0,
      recommendationTemplate: 'Initiate emergency burn cuts and accelerate outstanding invoice collections immediately.',
      businessImpact: 'Imminent risk of cash exhaustion within 90 days.',
      tags: ['RUNWAY', 'CRITICAL', 'LIQUIDITY'],
      enabled: true,
      version: '1.0',
      condition: ({ metrics }) => {
        const runway = metrics.get('RUNWAY_MONTHS')?.value;
        return runway !== undefined && runway < 3;
      },
    });

    // 2. DSO Receivable Expansion Rule
    this.registerRule({
      ruleId: 'RULE_RECEIVABLE_GROWTH_FAST',
      ruleName: 'Accelerated Receivables Lockup',
      category: 'RECEIVABLES',
      description: 'Triggered when Days Sales Outstanding (DSO) exceeds 45 days.',
      severity: 'HIGH',
      priority: 8,
      confidence: 0.95,
      recommendationTemplate: 'Enforce strict 14-day payment terms and issue overdue payment reminders to top customers.',
      businessImpact: 'Capital is locked up in unpaid customer invoices.',
      tags: ['RECEIVABLES', 'DSO', 'WORKING_CAPITAL'],
      enabled: true,
      version: '1.0',
      condition: ({ metrics }) => {
        const dso = metrics.get('DSO')?.value;
        return dso !== undefined && dso > 45;
      },
    });

    // 3. Payroll Concentration Rule
    this.registerRule({
      ruleId: 'RULE_PAYROLL_CONCENTRATION',
      ruleName: 'High Payroll Concentration',
      category: 'PAYROLL',
      description: 'Triggered when payroll expenditure facts indicate disproportionate opex.',
      severity: 'MEDIUM',
      priority: 6,
      confidence: 0.90,
      recommendationTemplate: 'Pause non-essential headcount expansion until revenue growth stabilizes.',
      businessImpact: 'Fixed payroll commitments limit financial flexibility.',
      tags: ['PAYROLL', 'OPEX', 'EFFICIENCY'],
      enabled: true,
      version: '1.0',
      condition: ({ facts }) => {
        return facts.some(f => f.factType === 'PAYROLL_INCREASED' && f.supportingMetrics.PAYROLL_TOTAL > 200000);
      },
    });

    // 4. Tax Overdue Rule
    this.registerRule({
      ruleId: 'RULE_TAX_OVERDUE',
      ruleName: 'Regulatory Tax Compliance Exposure',
      category: 'TAX',
      description: 'Triggered when pending GST or TDS tax liabilities are created.',
      severity: 'HIGH',
      priority: 9,
      confidence: 1.0,
      recommendationTemplate: 'Remit statutory tax liabilities before due date to prevent interest penalties.',
      businessImpact: 'Risk of statutory penalty fines and legal compliance audits.',
      tags: ['TAX', 'COMPLIANCE', 'GST', 'TDS'],
      enabled: true,
      version: '1.0',
      condition: ({ facts }) => {
        return facts.some(f => f.factType === 'GST_LIABILITY_CREATED');
      },
    });

    // 5. Working Capital Deterioration Rule
    this.registerRule({
      ruleId: 'RULE_WORKING_CAPITAL_DETERIORATION',
      ruleName: 'Working Capital Deficit',
      category: 'WORKING_CAPITAL',
      description: 'Triggered when Current Ratio falls below 1.0.',
      severity: 'HIGH',
      priority: 8,
      confidence: 0.95,
      recommendationTemplate: 'Restructure short-term vendor payables to maintain positive working capital balance.',
      businessImpact: 'Current liabilities exceed current liquid assets.',
      tags: ['WORKING_CAPITAL', 'SOLVENCY'],
      enabled: true,
      version: '1.0',
      condition: ({ metrics }) => {
        const ratio = metrics.get('CURRENT_RATIO')?.value;
        return ratio !== undefined && ratio < 1.0;
      },
    });

    // 6. Revenue Quality Deterioration Rule
    this.registerRule({
      ruleId: 'RULE_REVENUE_QUALITY_DETERIORATION',
      ruleName: 'Revenue Growth Contraction',
      category: 'REVENUE',
      description: 'Triggered when revenue declines by over 10% MoM.',
      severity: 'HIGH',
      priority: 9,
      confidence: 0.95,
      recommendationTemplate: 'Audit customer churn drivers and re-evaluate core sales retention strategy.',
      businessImpact: 'Top-line contraction accelerates cash burn rate.',
      tags: ['REVENUE', 'CHURN', 'GROWTH'],
      enabled: true,
      version: '1.0',
      condition: ({ metrics }) => {
        const growth = metrics.get('REVENUE_GROWTH_PERCENT')?.value;
        return growth !== undefined && growth < -10;
      },
    });
  }
}
