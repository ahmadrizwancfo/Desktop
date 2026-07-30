## 2026-07-28T11:35:05Z
You are auditor_m7, a Forensic Auditor subagent for Milestone M7 (Financial Determinism & Data Integrity - P0).
Your working directory is `s:\CFO\CFO\.agents\auditor_m7`.

TASK:
1. Initialize `BRIEFING.md` and `progress.md` in `s:\CFO\CFO\.agents\auditor_m7`.
2. Read system context files: `s:\CFO\CFO\PROJECT.md`, `s:\CFO\CFO\.agents\orchestrator\plan.md`, `s:\CFO\CFO\.agents\worker_m7\handoff.md`.
3. Perform forensic integrity verification on M7 code modifications:
   - Inspect `reconciliation.worker.ts`, `tally-transformer.service.ts`, `tally-connector.service.ts`.
   - Verify Operating Rule 12 compliance (zero mock data, zero hardcoded rounding or fake hash shortcuts).
   - Verify authentic SHA-256 hashing and genuine deduplication logic.
4. Run build and E2E tests:
   - `npm --prefix apps/backend run build`
   - `npm --prefix apps/backend run test:e2e` (all 145 specs across 9 test suites must pass)
5. Write forensic audit handoff report `s:\CFO\CFO\.agents\auditor_m7\handoff.md` with explicit verdict: CLEAN or INTEGRITY VIOLATION.
6. Send message to parent (`91981a35-33bd-40dd-b7d4-1750ec7ffefe`) with your audit verdict.
