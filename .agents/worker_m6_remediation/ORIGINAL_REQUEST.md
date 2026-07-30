## 2026-07-28T11:32:08Z
You are the Production Readiness & Observability Remediation Worker for FounderCFO V19.
Your working directory is s:\CFO\CFO\.agents\worker_m6_remediation.
Please create your working directory s:\CFO\CFO\.agents\worker_m6_remediation if it doesn't exist, and create your BRIEFING.md and progress.md.

Read s:\CFO\CFO\.agents\ORIGINAL_REQUEST.md, s:\CFO\CFO\PROJECT.md, s:\CFO\CFO\.agents\orchestrator\plan.md, and s:\CFO\CFO\.agents\reviewer_m6\handoff.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your objective is to resolve the M6 review findings:
1. In `apps/backend/src/app.module.ts`:
   - Import `APP_FILTER` from `@nestjs/core` and `GlobalExceptionFilter` from `./common/filters/global-exception.filter`.
   - Add `{ provide: APP_FILTER, useClass: GlobalExceptionFilter }` to `providers` array so all NestJS test and application instances automatically inject correlation ID (`x-correlation-id`) headers and format structured JSON error responses.
2. In `apps/backend/test/m6-challenger-stress.e2e-spec.ts`:
   - Correct method names to match actual service contracts:
     - `sseService.addSubscriber` -> `sseService.subscribe`
     - `decisionEngine.evaluateDecisions` -> `decisionEngine.evaluateStatefulDecisions`
     - `tallyConnector.syncVouchers` -> `tallyConnector.syncTallyVouchers`
3. Verification:
   - Run backend build: `npm --prefix apps/backend run build` (verify 0 TS errors).
   - Run backend unit tests: `npm --prefix apps/backend test` (verify 14/14 suites pass).
   - Run backend E2E tests: `npm --prefix apps/backend run test:e2e` (verify 100% of test suites pass).

Write your handoff report to `s:\CFO\CFO\.agents\worker_m6_remediation\handoff.md`.
Report back via send_message when complete.

## 2026-07-28T11:33:29Z
**Context**: M6 Observability Remediation (`worker_m6_remediation`)

**Content**:
Challenger M6 has provided critical empirical feedback on correlation ID header tracing:
1. `x-correlation-id` response header MUST be present on ALL HTTP responses (both 2xx OK and 4xx/5xx exceptions). Currently it was only inside `GlobalExceptionFilter` (which only runs on exceptions).
2. Create/wire a NestJS middleware (`CorrelationIdMiddleware`) or interceptor in `apps/backend/src/common/middleware/correlation-id.middleware.ts` (or `app.module.ts`) that extracts or generates `x-correlation-id` UUID header and injects it into EVERY HTTP response header (`res.setHeader('x-correlation-id', correlationId)`).
3. Ensure `{ provide: APP_FILTER, useClass: GlobalExceptionFilter }` is added to `AppModule` providers array.
4. Correct method name mismatches in `test/m6-challenger-stress.e2e-spec.ts` (`sseService.subscribe`, `decisionEngine.evaluateStatefulDecisions`, `tallyConnector.syncTallyVouchers`).

Please execute these remediation steps, verify `npm --prefix apps/backend run build` and `npm --prefix apps/backend run test:e2e`, and deliver your handoff report to `s:\CFO\CFO\.agents\worker_m6_remediation\handoff.md`.

## 2026-07-28T11:35:34Z
**Context**: M6 Telemetry Log Fix in `decision-engine.service.ts`

**Content**:
Forensic Auditor M6 identified an issue causing Test 3.2 in `test/m6-challenger-stress.e2e-spec.ts` to fail:
- In `apps/backend/src/cfo-engine/decision-engine.service.ts` line 616 (`evaluateStatefulDecisions`):
```typescript
if (!state) return { diff: { new: [], updated: [], resolved: [] }, activeDecisions: [] };
```
When `state` is null (e.g. unseeded org in test 3.2), the function returned early WITHOUT logging `[TELEMETRY] DecisionEngine:`.

**Fix Required**:
Update line 616 to log telemetry before returning when `!state`:
```typescript
if (!state) {
    const duration = Date.now() - startTime;
    this.logger.log(`[TELEMETRY] DecisionEngine: duration ${duration} ms (decisionsCount=0, rulesEvaluated=0, activeDecisionUpdates=0, orgId=${organizationId})`);
    return { diff: { new: [], updated: [], resolved: [] }, activeDecisions: [] };
}
```

Also verify:
1. `CorrelationIdMiddleware` in `apps/backend/src/common/middleware/correlation-id.middleware.ts` sets `x-correlation-id` on ALL HTTP responses (`res.setHeader('x-correlation-id', correlationId)`).
2. `{ provide: APP_FILTER, useClass: GlobalExceptionFilter }` in `app.module.ts`.
3. Method names in `test/m6-challenger-stress.e2e-spec.ts` (`sseService.subscribe`, `decisionEngine.evaluateStatefulDecisions`, `tallyConnector.syncTallyVouchers`).

Run `npm --prefix apps/backend run test:e2e` to confirm 100% of specs (all 9 suites / 145 specs) pass cleanly with zero failures. Then deliver your handoff report.


