import { Injectable } from '@nestjs/common';
import { ValidationResult } from '../domain/validation.types';

@Injectable()
export class PerformanceValidatorService {
  /**
   * Enforces deterministic performance budgets (Full pipeline < 100ms, Decision < 20ms).
   */
  validatePerformanceBudget(actualMs: number, budgetMs = 100): ValidationResult {
    const passed = actualMs <= budgetMs;
    return {
      checkName: 'PERFORMANCE_BUDGET',
      passed,
      details: passed
        ? `Execution latency (${actualMs}ms) within performance budget (${budgetMs}ms).`
        : `Performance budget exceeded: ${actualMs}ms vs max allowed ${budgetMs}ms.`,
    };
  }
}
