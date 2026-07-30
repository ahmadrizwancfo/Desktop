## 2026-07-28T22:32:05Z
<USER_REQUEST>
You are a Worker subagent assigned to optimize LiveStateEngine DB refresh and concurrency performance for FounderCFO V19 Victory Audit Remediation.

Your working directory is `s:\CFO\CFO\.agents\worker_victory_remediation`. Create this directory for your state/progress files.

### Context & Goal
The independent Victory Auditor issued a verdict of **VICTORY REJECTED** because `test/tier5-adversarial-hardening.e2e-spec.ts` spec `1.1: LiveStateEngine DB refresh under full 100-request concurrency (< 250ms SLA)` recorded `maxDuration` = 869.84ms (failing the `< 250ms` assertion).

You must optimize `LiveStateEngineService` in `apps/backend/src/cfo-engine/live-state.engine.ts` so that concurrent DB refreshes/hydrations execute in < 250ms maxDuration under 100-request concurrency.

### Implementation Requirements
In `apps/backend/src/cfo-engine/live-state.engine.ts`:
1. **Check Cache First in `hydrateStateFromDb`**:
   At the start of `hydrateStateFromDb(organizationId: string)`, check if `this.liveStateMap.has(organizationId)`. If `cached` exists, return `cached` immediately.
2. **In-Flight Request Coalescing (`pendingHydrations`)**:
   Add `private pendingHydrations = new Map<string, Promise<LiveStateSnapshot>>();` property to `LiveStateEngineService`.
   In `hydrateStateFromDb(organizationId)`:
   - If `this.pendingHydrations.has(organizationId)`, return `await this.pendingHydrations.get(organizationId)!`.
   - Otherwise, wrap the hydration logic in a Promise, store it in `this.pendingHydrations.set(organizationId, hydrationPromise)`, and ensure `this.pendingHydrations.delete(organizationId)` is called in a `finally` block.
3. **Query Short-Circuiting**:
   In `hydrateStateFromDb`, query `orgFinancialState` first. If `state` is null (the organization has no financial state in DB), set `activeDecisions = []` and `actions = []` without issuing unnecessary `findMany` queries against empty tables. If `state` is present, run `Promise.all` for `activeDecisions` and `actions`.
4. **Cache Snapshot**:
   Call `this.setCachedState(organizationId, snapshot)` before returning the snapshot.

### MANDATORY INTEGRITY WARNING
> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Verification Commands
You MUST execute and document passing results for:
1. `npm --prefix apps/backend run build` (Must complete with 0 TypeScript/compilation errors)
2. `npm --prefix apps/backend test` (Must pass all unit tests)
3. `npm --prefix apps/backend run test:e2e` (Must pass all 162/162 specs across all 10 E2E test suites, specifically confirming spec 1.1 in tier5-adversarial-hardening.e2e-spec.ts passes well under < 250ms SLA)

### Deliverables
Write `s:\CFO\CFO\.agents\worker_victory_remediation\handoff.md` detailing:
1. Changes made to `live-state.engine.ts`
2. Exact build, unit test, and E2E test results (including printed `maxDuration` metric for spec 1.1)
3. Verification confirmation.

When complete, send a message back to parent with a concise summary and path to your handoff report.
</USER_REQUEST>
