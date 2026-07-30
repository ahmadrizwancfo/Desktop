## 2026-07-28T11:29:50Z
You are worker_m7, the Worker subagent for Milestone M7 (Rule-Based Financial Determinism & Data Integrity - P0).
Your working directory is `s:\CFO\CFO\.agents\worker_m7`.

TASK:
1. Initialize `BRIEFING.md` and `progress.md` in `s:\CFO\CFO\.agents\worker_m7`.
2. Read system context files: `s:\CFO\CFO\PROJECT.md`, `s:\CFO\CFO\.agents\orchestrator\plan.md`, `s:\CFO\CFO\.agents\worker_m6\handoff.md`.

3. Implement Milestone M7 Financial Determinism & Data Integrity Requirements (WS6 + WS7):
   a. `apps/backend/src/events/workers/reconciliation.worker.ts`:
      - Implement monetary rounding to two decimal places (`roundToTwoDecimals`) on all monetary calculation and addition steps to eliminate IEEE 754 floating-point precision drift across retries, server restarts, and concurrent runs.
   b. `apps/backend/src/integrations/tally/tally-transformer.service.ts`:
      - Replace non-deterministic fallback `Date.now()` with a stable, immutable, deterministic SHA-256 hash identifier derived from `orgId + voucherNumber + amount + date`.
   c. `apps/backend/src/integrations/tally/tally-connector.service.ts`:
      - Enforce ingestion deduplication check before event emission (`prisma.transaction.findFirst({ where: { externalId: canonicalTx.id, bankAccount: { organizationId } } })`) so duplicate imports are safely ignored without corrupting balances or creating duplicate transactions.
      - Detect partial synchronization failures, log audit events, and recover safely without silent data loss.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work.

4. Run build and test verifications:
   - `npm --prefix apps/backend run build`
   - `npm --prefix apps/backend test`
   - `npm --prefix apps/backend run test:e2e` (all 137 specs must pass)

5. Write handoff report `s:\CFO\CFO\.agents\worker_m7\handoff.md`.
6. Send completion message to parent (`91981a35-33bd-40dd-b7d4-1750ec7ffefe`) with your handoff location and test results.
