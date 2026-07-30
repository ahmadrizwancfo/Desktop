import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { FinancialConcept, FinancialConceptSchema } from '../domain/ontology.types';

@Injectable()
export class FinancialOntologyService implements OnModuleInit {
  private readonly logger = new Logger(FinancialOntologyService.name);
  private readonly conceptMap = new Map<string, FinancialConcept>();

  onModuleInit() {
    this.initializeOntology();
    this.logger.log(`⚡ FinancialOntologyService Initialized with ${this.conceptMap.size} formal financial concepts.`);
  }

  /**
   * Get concept by ID.
   */
  getConcept(conceptId: string): FinancialConcept | undefined {
    return this.conceptMap.get(conceptId.toUpperCase());
  }

  /**
   * List all registered financial concepts.
   */
  getAllConcepts(): FinancialConcept[] {
    return Array.from(this.conceptMap.values());
  }

  /**
   * Register or override a financial concept in the vocabulary.
   */
  registerConcept(concept: FinancialConcept): void {
    const validated = Object.freeze(FinancialConceptSchema.parse(concept));
    this.conceptMap.set(validated.conceptId.toUpperCase(), validated);
  }

  /**
   * Seed the core 20 Formal Financial Concepts into FounderCFO's Semantic Ontology.
   */
  private initializeOntology(): void {
    const concepts: FinancialConcept[] = [
      {
        conceptId: 'CONCEPT_LIQUIDITY',
        name: 'Liquidity & Cash Availability',
        description: 'The capacity of a business to satisfy immediate financial commitments with spendable cash reserves.',
        parentConcept: null,
        relatedConcepts: ['CONCEPT_RUNWAY', 'CONCEPT_WORKING_CAPITAL'],
        businessMeaning: 'Cash reserves available in bank accounts to cover operating expenses.',
        supportedMetrics: ['CASH_BALANCE', 'CASH_RATIO', 'QUICK_RATIO'],
        supportedFacts: ['CASH_INCREASED', 'CASH_DECREASED'],
        supportedRules: ['RULE_CASH_BALANCE_ANOMALY'],
        supportedInsights: ['Healthy Cash Discipline'],
      },
      {
        conceptId: 'CONCEPT_RUNWAY',
        name: 'Cash Runway Horizon',
        description: 'The number of months until cash balance reaches zero at current net burn velocity.',
        parentConcept: 'CONCEPT_LIQUIDITY',
        relatedConcepts: ['CONCEPT_BURN', 'CONCEPT_LIQUIDITY'],
        businessMeaning: 'Time horizon before company runs out of money.',
        supportedMetrics: ['RUNWAY_MONTHS', 'RUNWAY_DAYS'],
        supportedFacts: ['RUNWAY_REDUCED', 'RUNWAY_EXTENDED'],
        supportedRules: ['RULE_RUNWAY_CRITICAL'],
        supportedInsights: ['Burn Rate Unsustainable & Critical Runway Buffer'],
      },
      {
        conceptId: 'CONCEPT_BURN',
        name: 'Operating Cash Burn',
        description: 'The rate at which a company consumes cash reserves to cover operational overhead.',
        parentConcept: null,
        relatedConcepts: ['CONCEPT_EXPENSES', 'CONCEPT_RUNWAY'],
        businessMeaning: 'Net monthly cash drain from operations.',
        supportedMetrics: ['GROSS_BURN', 'NET_BURN'],
        supportedFacts: ['BURN_INCREASED', 'BURN_REDUCED'],
        supportedRules: ['RULE_RAPID_BURN_INCREASE'],
        supportedInsights: ['Burn Rate Unsustainable'],
      },
      {
        conceptId: 'CONCEPT_RECEIVABLES',
        name: 'Accounts Receivable & Invoice Collections',
        description: 'Outstanding customer billings awaiting cash collection.',
        parentConcept: 'CONCEPT_WORKING_CAPITAL',
        relatedConcepts: ['CONCEPT_CUSTOMERS', 'CONCEPT_REVENUE'],
        businessMeaning: 'Earned revenue currently locked up in unpaid customer invoices.',
        supportedMetrics: ['DSO', 'WORKING_CAPITAL'],
        supportedFacts: ['RECEIVABLES_INCREASED', 'RECEIVABLES_IMPROVED'],
        supportedRules: ['RULE_RECEIVABLE_GROWTH_FAST'],
        supportedInsights: ['Customer Collections Slowing Down'],
      },
      {
        conceptId: 'CONCEPT_TAX_COMPLIANCE',
        name: 'Statutory Tax Obligations',
        description: 'Regulatory liabilities due to tax authorities including GST and TDS.',
        parentConcept: null,
        relatedConcepts: ['CONCEPT_PAYABLES', 'CONCEPT_COMPLIANCE'],
        businessMeaning: 'Statutory obligations owed to federal and state tax authorities.',
        supportedMetrics: ['WORKING_CAPITAL'],
        supportedFacts: ['GST_LIABILITY_CREATED'],
        supportedRules: ['RULE_TAX_OVERDUE'],
        supportedInsights: ['Statutory Tax Compliance Pressure Increasing'],
      },
      {
        conceptId: 'CONCEPT_WORKING_CAPITAL',
        name: 'Working Capital Cycle',
        description: 'The net difference between current liquid assets and short-term payables.',
        parentConcept: null,
        relatedConcepts: ['CONCEPT_LIQUIDITY', 'CONCEPT_RECEIVABLES', 'CONCEPT_PAYABLES'],
        businessMeaning: 'Operational liquidity buffer required to run day-to-day business operations.',
        supportedMetrics: ['WORKING_CAPITAL', 'CURRENT_RATIO', 'CASH_CONVERSION_CYCLE'],
        supportedFacts: ['CASH_DECREASED', 'RECEIVABLES_INCREASED'],
        supportedRules: ['RULE_WORKING_CAPITAL_DETERIORATION'],
        supportedInsights: ['Working Capital Deficit Tightening Liquidity'],
      },
    ];

    for (const c of concepts) {
      this.registerConcept(c);
    }
  }
}
