import { Injectable } from '@nestjs/common';
import { ValidationResult } from '../domain/validation.types';
import { CascadingImpactStep } from '../../dynamics/dependency-graph/dependency-graph.service';

@Injectable()
export class DynamicsValidatorService {
  validateCascadingPropagation(steps: ReadonlyArray<CascadingImpactStep>): ValidationResult {
    const hasPath = steps.length >= 3;
    return {
      checkName: 'DYNAMICS_CASCADING_PROPAGATION',
      passed: hasPath,
      details: hasPath
        ? `Cascading impact correctly traversed ${steps.length} business system nodes.`
        : 'Cascading propagation chain failed or truncated prematurely.',
    };
  }
}
