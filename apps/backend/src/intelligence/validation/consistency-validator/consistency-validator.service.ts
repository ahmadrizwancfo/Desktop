import { Injectable } from '@nestjs/common';
import { ValidationResult } from '../domain/validation.types';

@Injectable()
export class ConsistencyValidatorService {
  /**
   * Evaluates outputs from repeated executions to verify 100% determinism.
   */
  validateConsistency(run1Output: any, run2Output: any): ValidationResult {
    const json1 = JSON.stringify(run1Output);
    const json2 = JSON.stringify(run2Output);

    const isIdentical = json1 === json2;

    return {
      checkName: 'DETERMINISM_CONSISTENCY',
      passed: isIdentical,
      details: isIdentical
        ? '100% Deterministic match: Parallel executions produced identical JSON output.'
        : 'Non-deterministic divergence detected between execution runs.',
    };
  }
}
