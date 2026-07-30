## 2026-07-27T10:31:19Z
You are the Backend Reliability & Mock Cleanup Worker for FounderCFO V19.
Your working directory is s:\CFO\CFO\.agents\worker_m3.
Please create your working directory s:\CFO\CFO\.agents\worker_m3 if it doesn't exist, and create your BRIEFING.md and progress.md.

Read s:\CFO\CFO\.agents\ORIGINAL_REQUEST.md, s:\CFO\CFO\PROJECT.md, and s:\CFO\CFO\.agents\orchestrator\plan.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your objective is to execute Milestone M3 (Reliability & Backend Mock Cleanup):
1. `apps/backend/src/integrations/tally/tally-connector.service.ts`:
   - Remove hardcoded mock voucher array (`rawVouchers`).
   - Wire `syncTallyVouchers()` to parse real XML from `TallyClient`. If unconfigured/empty, handle cleanly with 0 vouchers.
   - Add ingestion deduplication check before event emission.
2. `apps/backend/src/bank-accounts/bank-sync/bank-sync.service.ts`:
   - Remove `MockICICIProvider` execution in production path.
   - Replace with production banking interface guard returning unconfigured/empty sync status when live credentials are not present.
3. `apps/backend/src/integrations/quickbooks.service.ts`:
   - Remove hardcoded mock QBO invoice and expense arrays.
   - Return clean empty sync response when unconfigured.
4. `apps/backend/src/cfo-engine/live-state.engine.ts`:
   - Remove non-null assertion `!`.
   - Remove duplicate `.on()` event bindings.
   - Parallelize `hydrateStateFromDb` using `Promise.all` for DB queries (<80ms target).
   - Add LRU cache bound and `OnModuleDestroy` cleanup handler.
5. `apps/backend/src/sse/sse.service.ts`:
   - Auto-prune empty subjects on subscriber count 0.
   - Complete subjects on `OnModuleDestroy`.
6. `apps/backend/src/cfo-engine/decision-engine.service.ts`:
   - Add guards for `NaN` / `Infinity` division on zero-transaction and zero-cash orgs.
   - Batch decision DB writes via `prisma.$transaction` or parallel operations (<200ms execution target).

After implementing the changes:
- Run backend tests (`npm --prefix apps/backend test` or `npm --prefix apps/backend run test:e2e`).
- Verify no compilation errors or broken tests.
- Write your handoff report to `s:\CFO\CFO\.agents\worker_m3\handoff.md`.
- Report back via send_message when complete.
