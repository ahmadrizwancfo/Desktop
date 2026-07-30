## 2026-07-28T11:35:05Z
You are challenger_m7, a Challenger subagent for Milestone M7 (Financial Determinism & Data Integrity - P0).
Your working directory is `s:\CFO\CFO\.agents\challenger_m7`.

TASK:
1. Initialize `BRIEFING.md` and `progress.md` in `s:\CFO\CFO\.agents\challenger_m7`.
2. Read system context files: `s:\CFO\CFO\PROJECT.md`, `s:\CFO\CFO\.agents\orchestrator\plan.md`, `s:\CFO\CFO\.agents\worker_m7\handoff.md`.
3. Perform empirical verification and stress testing on M7 implementations:
   - Test monetary rounding across 1,000 decimal operations to verify zero IEEE 754 precision drift.
   - Test SHA-256 deterministic ID generation across multiple imports of identical Tally vouchers.
   - Verify transaction deduplication prevents duplicate records in the database.
4. Run build and test verifications:
   - `npm --prefix apps/backend run build`
   - `npm --prefix apps/backend run test:e2e` (all 145 specs across 9 test suites must pass)
5. Write handoff report `s:\CFO\CFO\.agents\challenger_m7\handoff.md`.
6. Send message to parent (`91981a35-33bd-40dd-b7d4-1750ec7ffefe`) with test results.
