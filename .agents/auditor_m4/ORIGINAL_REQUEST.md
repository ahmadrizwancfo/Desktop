## 2026-07-27T13:18:24Z
You are auditor_m4, a Forensic Auditor subagent for Milestone M4 (Security, Tenant Isolation & Production-Grade SSRF Protection).
Your working directory is `s:\CFO\CFO\.agents\auditor_m4`.

TASK:
1. Initialize `BRIEFING.md` and `progress.md` in `s:\CFO\CFO\.agents\auditor_m4`.
2. Read system context files: `s:\CFO\CFO\PROJECT.md`, `s:\CFO\CFO\.agents\orchestrator\plan.md`, `s:\CFO\CFO\.agents\worker_m4\handoff.md`.
3. Perform forensic integrity verification on M4 security modifications:
   - Inspect `cfo-engine.controller.ts`, `financial-metrics.controller.ts`, `bank-accounts.controller.ts`, `invoices.controller.ts`, `tally-client.ts`, `jwt.strategy.ts`.
   - Verify zero mock data or hardcoded security bypasses (Rule 12 compliance).
   - Verify authentic implementation of SSRF checks and JWT organization extraction.
4. Run build and E2E tests:
   - `npm --prefix apps/backend run build`
   - `npm --prefix apps/backend run test:e2e` (all 104 specs must pass)
5. Write forensic audit handoff report `s:\CFO\CFO\.agents\auditor_m4\handoff.md` with explicit verdict: CLEAN or INTEGRITY VIOLATION.
6. Send message to parent (`91981a35-33bd-40dd-b7d4-1750ec7ffefe`) with your audit verdict.
