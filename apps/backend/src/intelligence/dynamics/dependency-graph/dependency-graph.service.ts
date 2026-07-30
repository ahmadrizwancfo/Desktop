import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BusinessSystemState } from '../domain/system.types';

export interface CascadingImpactStep {
  stepIndex: number;
  systemId: string;
  systemName: string;
  impactDescription: string;
  healthDelta: number;
}

@Injectable()
export class DependencyGraphService implements OnModuleInit {
  private readonly logger = new Logger(DependencyGraphService.name);

  // Adjacency List: Map<SystemID, DownstreamSystemIDs[]>
  private readonly graph = new Map<string, string[]>();

  onModuleInit() {
    this.buildGraph();
    this.logger.log(`⚡ DependencyGraphService Initialized with ${this.graph.size} interconnected business systems.`);
  }

  private buildGraph(): void {
    this.graph.set('SYS_HIRING', ['SYS_EXPENSE', 'SYS_GROWTH']);
    this.graph.set('SYS_EXPENSE', ['SYS_CASH', 'SYS_GROWTH']);
    this.graph.set('SYS_GROWTH', ['SYS_REVENUE']);
    this.graph.set('SYS_CUSTOMER_ECONOMICS', ['SYS_REVENUE']);
    this.graph.set('SYS_REVENUE', ['SYS_CASH', 'SYS_WORKING_CAPITAL', 'SYS_COMPLIANCE']);
    this.graph.set('SYS_VENDOR_ECONOMICS', ['SYS_WORKING_CAPITAL', 'SYS_EXPENSE']);
    this.graph.set('SYS_WORKING_CAPITAL', ['SYS_CASH']);
    this.graph.set('SYS_COMPLIANCE', ['SYS_CASH']);
    this.graph.set('SYS_CASH', ['SYS_FUNDING', 'SYS_HIRING']);
    this.graph.set('SYS_FUNDING', ['SYS_CASH', 'SYS_GROWTH']);
  }

  /**
   * Traverse the dependency graph to simulate cascading impact events.
   * e.g. Hiring Event -> Expense Increase -> Cash Drain -> Runway Reduction -> Funding Alert
   */
  traceCascadingImpact(triggerSystemId: string, initialImpactDescription: string): CascadingImpactStep[] {
    const steps: CascadingImpactStep[] = [];
    const visited = new Set<string>();
    const queue: Array<{ systemId: string; desc: string; depth: number }> = [
      { systemId: triggerSystemId, desc: initialImpactDescription, depth: 1 }
    ];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (visited.has(curr.systemId)) continue;
      visited.add(curr.systemId);

      steps.push({
        stepIndex: steps.length + 1,
        systemId: curr.systemId,
        systemName: this.getSystemName(curr.systemId),
        impactDescription: curr.desc,
        healthDelta: -5 * curr.depth,
      });

      const downstreams = this.graph.get(curr.systemId) || [];
      for (const nextId of downstreams) {
        if (!visited.has(nextId)) {
          queue.push({
            systemId: nextId,
            desc: `Cascading effect propagated from ${curr.systemId} to ${nextId}`,
            depth: curr.depth + 1,
          });
        }
      }
    }

    this.logger.log(`Traversed Cascading Impact path from [${triggerSystemId}]: ${steps.length} system nodes affected.`);
    return steps;
  }

  getDownstreamSystems(systemId: string): string[] {
    return this.graph.get(systemId) || [];
  }

  private getSystemName(systemId: string): string {
    const names: Record<string, string> = {
      SYS_CASH: 'Cash & Liquidity System',
      SYS_REVENUE: 'Revenue & Top-Line Engine',
      SYS_EXPENSE: 'Operating Expense System',
      SYS_HIRING: 'Headcount & Payroll System',
      SYS_WORKING_CAPITAL: 'Working Capital System',
      SYS_GROWTH: 'Growth & Expansion Engine',
      SYS_FUNDING: 'Capital & Treasury Funding System',
      SYS_COMPLIANCE: 'Statutory Tax Compliance System',
      SYS_CUSTOMER_ECONOMICS: 'Customer Unit Economics System',
      SYS_VENDOR_ECONOMICS: 'Vendor Dependency System',
    };
    return names[systemId] || systemId;
  }
}
