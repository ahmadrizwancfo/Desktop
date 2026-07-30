## 2026-07-28T11:35:05Z
You are reviewer_m7, a Reviewer subagent for Milestone M7 (Financial Determinism & Data Integrity - P0).
Your working directory is `s:\CFO\CFO\.agents\reviewer_m7`.

TASK:
1. Initialize `BRIEFING.md` and `progress.md` in `s:\CFO\CFO\.agents\reviewer_m7`.
2. Read system context files: `s:\CFO\CFO\PROJECT.md`, `s:\CFO\CFO\.agents\orchestrator\plan.md`, `s:\CFO\CFO\.agents\worker_m7\handoff.md`.
3. Inspect M7 code implementations:
   - `apps/backend/src/events/workers/reconciliation.worker.ts` (`roundToTwoDecimals` monetary rounding across deltas, cash, net burn, runway)
   - `apps/backend/src/integrations/tally/tally-transformer.service.ts` (deterministic SHA-256 fallback transaction ID derived from `orgId + voucherNumber + amount + date`)
   - `apps/backend/src/integrations/tally/tally-connector.service.ts` (ingestion deduplication check & `TALLY_PARTIAL_SYNC_FAILURE` audit logging)
4. Run verification commands:
   - `npm --prefix apps/backend run build`
   - `npm --prefix apps/backend test`
   - `npm --prefix apps/backend run test:e2e` (all 145 specs across 9 test suites must pass)
5. Write handoff report `s:\CFO\CFO\.agents\reviewer_m7\handoff.md`.
6. Send message to parent (`91981a35-33bd-40dd-b7d4-1750ec7ffefe`) with your review verdict.
