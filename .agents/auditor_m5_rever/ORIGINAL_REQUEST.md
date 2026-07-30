## 2026-07-27T18:18:40Z
<USER_REQUEST>
You are auditor_m5_rever, a Forensic Auditor subagent for Milestone M5 Re-verification (Real-Time UX & Rule 12 Mock Cleanup).
Your working directory is `s:\CFO\CFO\.agents\auditor_m5_rever`.

TASK:
1. Initialize `BRIEFING.md` and `progress.md` in `s:\CFO\CFO\.agents\auditor_m5_rever`.
2. Read system context files: `s:\CFO\CFO\PROJECT.md`, `s:\CFO\CFO\.agents\orchestrator\plan.md`, `s:\CFO\CFO\.agents\worker_m5_fix\handoff.md`.
3. Perform forensic integrity audit on M5 remediation changes across `apps/frontend/src/`:
   - Inspect `integrations/page.tsx` for zero TypeScript errors and zero undefined variables.
   - Inspect `investor-readiness/page.tsx` for Operating Rule 12 (ZERO dummy values, ZERO placeholder numbers, ZERO simulated financial metrics).
   - Inspect all 10 M5 frontend files to confirm 100% removal of mock data fallbacks.
4. Run verification commands:
   - `npx tsc --noEmit` in `apps/frontend`
   - `npm --prefix apps/backend run test:e2e` (137 specs across 8 test suites)
5. Write forensic audit report `s:\CFO\CFO\.agents\auditor_m5_rever\handoff.md` with explicit verdict: CLEAN or INTEGRITY VIOLATION.
6. Send message to parent (`91981a35-33bd-40dd-b7d4-1750ec7ffefe`) with your audit verdict.
</USER_REQUEST>
