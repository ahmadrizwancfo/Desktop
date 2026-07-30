import { Injectable, Logger } from '@nestjs/common';
import { BusinessContext, BusinessContextSchema, BusinessStage, BusinessModel } from '../domain/context.types';

@Injectable()
export class BusinessContextEngineService {
  private readonly logger = new Logger(BusinessContextEngineService.name);

  /**
   * Derive tailored business context rules & parameters based on company stage & business model.
   */
  evaluateContext(params?: {
    stage?: BusinessStage;
    businessModel?: BusinessModel;
    riskTolerance?: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
  }): BusinessContext {
    const stage = params?.stage || 'SEED';
    const businessModel = params?.businessModel || 'ENTERPRISE_SAAS';
    const riskTolerance = params?.riskTolerance || 'BALANCED';

    let targetRunwayMonths = 12;
    let contextMultiplier = 1.0;

    // Stage Adjustments
    if (stage === 'SEED') {
      targetRunwayMonths = 18; // Seed startups require longer runway to reach PMF
      contextMultiplier = 1.2;
    } else if (stage === 'SERIES_A') {
      targetRunwayMonths = 15;
      contextMultiplier = 1.1;
    } else if (stage === 'PROFITABLE') {
      targetRunwayMonths = 6;  // Profitable businesses require smaller cash buffers
      contextMultiplier = 0.8;
    }

    // Model Adjustments
    if (businessModel === 'ENTERPRISE_SAAS') {
      // Long sales cycle -> high DSO tolerance, higher ARR focus
      contextMultiplier *= 1.0;
    } else if (businessModel === 'AGENCY') {
      // Low working capital tolerance -> strict 30-day DSO target
      contextMultiplier *= 1.15;
    }

    const context = {
      stage,
      businessModel,
      riskTolerance,
      targetRunwayMonths,
      maxAcceptableBurn: 2000000,
      contextMultiplier: Number(contextMultiplier.toFixed(2)),
    };

    this.logger.log(`Evaluated Business Context: [Stage: ${stage} | Model: ${businessModel} | Multiplier: ${contextMultiplier}]`);
    return Object.freeze(BusinessContextSchema.parse(context));
  }
}
