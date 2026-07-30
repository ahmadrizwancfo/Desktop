import { Injectable } from '@nestjs/common';
import { ValidationResult } from '../domain/validation.types';
import { UniversalDecisionObject } from '../../cognition/domain/decision.types';

@Injectable()
export class DecisionValidatorService {
  validateDecision(decision: UniversalDecisionObject): ValidationResult[] {
    const results: ValidationResult[] = [];

    // 1. Decision Completeness & Required Fields Check
    const isComplete = Boolean(decision.decisionId && decision.title && decision.businessProblem);
    results.push({
      checkName: 'DECISION_COMPLETENESS',
      passed: isComplete,
      details: isComplete ? 'Decision contains all required fields.' : 'Missing title or business problem.',
    });

    // 2. Evidence Presence Check
    const hasEvidence = decision.evidence.length > 0;
    results.push({
      checkName: 'EVIDENCE_PRESENCE',
      passed: hasEvidence,
      details: hasEvidence ? `Verified ${decision.evidence.length} evidence items.` : 'Decision lacks audit evidence items.',
    });

    // 3. Recommended Actions Presence Check
    const hasActions = decision.recommendedActions.length > 0;
    results.push({
      checkName: 'ACTION_PLAN_PRESENCE',
      passed: hasActions,
      details: hasActions ? `Contains ${decision.recommendedActions.length} recommended actions.` : 'Missing recommended action plan.',
    });

    // 4. Valid Severity & Confidence Range Check
    const validConfidence = decision.confidence.confidenceScore >= 0.0 && decision.confidence.confidenceScore <= 1.0;
    results.push({
      checkName: 'CONFIDENCE_VALIDITY',
      passed: validConfidence,
      details: validConfidence ? `Confidence score (${decision.confidence.confidenceScore}) within valid range.` : 'Confidence score out of range.',
    });

    return results;
  }
}
