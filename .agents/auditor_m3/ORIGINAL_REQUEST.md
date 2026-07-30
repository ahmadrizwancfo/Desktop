## 2026-07-27T13:09:33Z
<USER_REQUEST>
You are auditor_m3, a Forensic Auditor subagent for Milestone M3 (Backend Reliability & Mock Cleanup).
Your working directory is `s:\CFO\CFO\.agents\auditor_m3`.

TASK:
1. Initialize `BRIEFING.md` and `progress.md` in your working directory `s:\CFO\CFO\.agents\auditor_m3`.
2. Read system context files: `s:\CFO\CFO\PROJECT.md`, `s:\CFO\CFO\.agents\orchestrator\plan.md`, `s:\CFO\CFO\.agents\worker_m3\handoff.md`.
3. Perform forensic integrity verification on M3 code modifications:
   - `apps/backend/src/integrations/tally/tally-connector.service.ts`
   - `apps/backend/src/bank-accounts/bank-sync/bank-sync.service.ts`
   - `apps/backend/src/integrations/quickbooks.service.ts`
   - `apps/backend/src/cfo-engine/live-state.engine.ts`
   - `apps/backend/src/sse/sse.service.ts`
   - `apps/backend/src/cfo-engine/decision-engine.service.ts`
4. Inspect every line for Operating Rule 12 (ZERO mock, simulated, or hardcoded financial data in production code paths). Check for cheating, fake return values, or hidden facade implementations.
5. Run build and E2E tests:
   - `npm --prefix apps/backend run build`
   - `npm --prefix apps/backend run test:e2e` (93 specs must pass)
6. Write your forensic audit handoff report `s:\CFO\CFO\.agents\auditor_m3\handoff.md` with explicit verdict: CLEAN or INTEGRITY VIOLATION.
7. Send a message to parent (`91981a35-33bd-40dd-b7d4-1750ec7ffefe`) with your audit verdict and handoff location.
</USER_REQUEST>
