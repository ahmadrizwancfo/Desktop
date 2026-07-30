import { Injectable } from '@nestjs/common';
import { ValidationResult } from '../domain/validation.types';
import { StructuredExplanation } from '../../semantic/domain/explanation.types';

@Injectable()
export class ExplainabilityValidatorService {
  validateExplanation(explanation: StructuredExplanation): ValidationResult[] {
    const results: ValidationResult[] = [];

    // 1. Audit Chain Integrity (What + Why + Impact)
    const hasAuditChain = Boolean(explanation.whatHappened && explanation.whyItHappened && explanation.businessImpact);
    results.push({
      checkName: 'EXPLAINABILITY_AUDIT_CHAIN',
      passed: hasAuditChain,
      details: hasAuditChain ? 'Audit explanation answers What, Why, and Business Impact.' : 'Incomplete audit chain.',
    });

    // 2. Metrics & Facts Linkage
    const hasSupportingMetrics = Object.keys(explanation.supportingMetrics).length > 0;
    results.push({
      checkName: 'EXPLAINABILITY_METRIC_LINKAGE',
      passed: hasSupportingMetrics,
      details: hasSupportingMetrics ? 'Supporting metrics linked to explanation.' : 'Explanation lacks metric linkage.',
    });

    // 3. Recommendation Ownership & Urgency
    const hasOwner = Boolean(explanation.recommendedOwner && explanation.urgency);
    results.push({
      checkName: 'EXPLAINABILITY_OWNERSHIP',
      passed: hasOwner,
      details: hasOwner ? `Recommended owner: ${explanation.recommendedOwner} (Urgency: ${explanation.urgency})` : 'Missing owner assignment.',
    });

    return results;
  }
}
