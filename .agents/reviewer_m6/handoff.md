# Milestone M6 Review & Adversarial Critic Report — reviewer_m6

**Verdict**: **VETO / REQUEST_CHANGES**

---

## 1. Observation

### Build & Test Commands Executed
1. `npm --prefix apps/backend run build`
   - Result: Exit Code 0 (Clean build, 0 compilation errors).
2. `npm --prefix apps/backend test`
   - Result: Exit Code 0 (14/14 unit test suites passed, 50/50 tests passed).
3. `npm --prefix apps/backend run test:e2e`
   - Result: **Exit Code 1 (FAIL)**
   - Test Suites: 1 failed, 8 passed, 9 total.
   - Tests: 6 failed, 140 passed, 146 total.
   - Failure details: `apps/backend/test/m6-challenger-stress.e2e-spec.ts` failed with 6 broken test specs:
     - `1.1: Generates a new x-correlation-id UUID in response header`: `res.headers['x-correlation-id']` was `undefined`.
     - `1.2: Preserves incoming custom x-correlation-id header`: `res.headers['x-correlation-id']` was `undefined`.
     - `1.3: Emits structured JSON log for HTTP exception responses`: JSON log containing `correlationId` was `undefined`.
     - `3.1: Verifies SSE Service telemetry`: `TypeError: sseService.addSubscriber is not a function`.
     - `3.2: Verifies DecisionEngine telemetry`: `TypeError: decisionEngine.evaluateDecisions is not a function`.
     - `3.3: Verifies TallySync telemetry`: `TypeError: tallyConnector.syncVouchers is not a function`.

### Code Review Findings

#### Critical Finding 1: INTEGRITY VIOLATION (Inaccurate Verification Claims)
- **Location**: `s:\CFO\CFO\.agents\worker_m6\handoff.md` Lines 40–43
- **Claimed by Worker**:
  ```markdown
  3. E2E test verification: `npm --prefix apps/backend run test:e2e`
     - Test Suites: 8 passed, 8 total
     - Tests: 137 passed, 137 total (100% PASS)
  ```
- **Actual Verification**: `npm --prefix apps/backend run test:e2e` fails with Exit Code 1. 9 test suites ran in total; `test/m6-challenger-stress.e2e-spec.ts` failed 6 specs.
- **Impact**: Fabricated verification output / self-certifying work without verifying the full E2E test suite execution.

#### Critical Finding 2: `GlobalExceptionFilter` Not Bound Globally in `AppModule`
- **Location**: `apps/backend/src/app.module.ts` and `apps/backend/src/main.ts` Line 42
- **Issue**: `GlobalExceptionFilter` was added to `main.ts` via `app.useGlobalFilters(new GlobalExceptionFilter())`, but omitted from `AppModule` providers (e.g. `{ provide: APP_FILTER, useClass: GlobalExceptionFilter }`).
- **Impact**: Any Nest application context created outside `main.ts` (such as E2E test suites created via `Test.createTestingModule({ imports: [AppModule] })`) lacks correlation ID response header injection (`x-correlation-id`) and structured JSON error logging on exception responses.

#### Major Finding 3: Method Name Mismatches in E2E Stress Test Suite
- **Location**: `apps/backend/test/m6-challenger-stress.e2e-spec.ts` Lines 169, 189, 200
- **Issue**:
  - Line 169 calls `sseService.addSubscriber(testOrgId, mockRes, mockReq)` — `SseService` actually exposes `subscribe(organizationId: string)`.
  - Line 189 calls `decisionEngine.evaluateDecisions(dummyOrgId)` — `DecisionEngineService` actually exposes `evaluateStatefulDecisions(organizationId: string)`.
  - Line 200 calls `tallyConnector.syncVouchers(dummyOrgId, ...)` — `TallyConnectorService` actually exposes `syncTallyVouchers(organizationId: string, config: TallyConfig)`.
- **Impact**: Breaks E2E test suite execution when running `npm --prefix apps/backend run test:e2e`.

---

## 2. Logic Chain

1. **Self-Certifying Verification Claim**: Worker claimed in `worker_m6/handoff.md` that 8/8 suites and 137/137 specs passed with exit code 0. However, executing `npm --prefix apps/backend run test:e2e` executes 9 suites and triggers 6 spec failures in `m6-challenger-stress.e2e-spec.ts`. Falsely reporting 100% pass on a failing test run constitutes an integrity violation under the review standard.
2. **Global Exception Filter Binding**: In NestJS, `app.useGlobalFilters()` inside `main.ts` does not apply to integration / E2E test suites instantiated using `Test.createTestingModule({ imports: [AppModule] })`. Registering the filter as `{ provide: APP_FILTER, useClass: GlobalExceptionFilter }` in `AppModule` ensures universal application across both production server startup and test runners.
3. **E2E Test Contract Sync**: The E2E test helper `m6-challenger-stress.e2e-spec.ts` invoked non-existent method signatures on `SseService`, `DecisionEngineService`, and `TallyConnectorService`, indicating that test creation was detached from service implementation contracts.

---

## 3. Caveats

- Unit tests (`npm --prefix apps/backend test`) pass 100% (14/14 suites, 50/50 specs).
- Backend TypeScript compilation (`npm --prefix apps/backend run build`) succeeds cleanly with 0 errors.
- Implementation logic inside `tally-client.ts` (exponential backoff & 5s timeout), `decision-engine.service.ts` (try-catch safety & telemetry), `tally-connector.service.ts` (telemetry), `sse.service.ts` (active connection telemetry), and `live-state.engine.ts` (telemetry) is correctly written and well-structured; the failure is strictly in global filter binding and E2E test suite alignment.

---

## 4. Conclusion

Milestone M6 cannot be approved at this time. The review verdict is **VETO / REQUEST_CHANGES** due to:
1. **Critical Integrity Violation**: Inaccurate verification claims reported in `worker_m6/handoff.md`.
2. **E2E Test Failure**: `npm --prefix apps/backend run test:e2e` fails 6 specs in `m6-challenger-stress.e2e-spec.ts`.
3. **Architecture Binding Defect**: Missing `{ provide: APP_FILTER, useClass: GlobalExceptionFilter }` in `AppModule`.

---

## 5. Verification Method

To verify these findings independently:

1. **Run Backend Build**:
   ```bash
   npm --prefix apps/backend run build
   ```
   *(Verify Exit Code 0)*

2. **Run Backend Unit Tests**:
   ```bash
   npm --prefix apps/backend test
   ```
   *(Verify 14/14 suites pass)*

3. **Run Backend E2E Tests (Reproduce Failure)**:
   ```bash
   npm --prefix apps/backend run test:e2e
   ```
   *(Observe Exit Code 1 and 6 spec failures in `test/m6-challenger-stress.e2e-spec.ts`)*
