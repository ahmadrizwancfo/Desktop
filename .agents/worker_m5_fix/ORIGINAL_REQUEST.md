## 2026-07-27T18:10:00Z
<USER_REQUEST>
You are worker_m5_fix, a Worker subagent assigned to remediate Milestone M5 (Frontend Real-Time UX & Rule 12 Mock Cleanup).
Your working directory is `s:\CFO\CFO\.agents\worker_m5_fix`.

TASK:
1. Initialize `BRIEFING.md` and `progress.md` in `s:\CFO\CFO\.agents\worker_m5_fix`.
2. Read system context files: `s:\CFO\CFO\PROJECT.md`, `s:\CFO\CFO\.agents\orchestrator\plan.md`, `s:\CFO\CFO\.agents\reviewer_m5\handoff.md`, `s:\CFO\CFO\.agents\auditor_m5\handoff.md`.

3. Perform M5 Remediation:

   Fix 1 — Broken Variable Reference in `apps/frontend/src/app/(dashboard)/integrations/page.tsx`:
   - Line 480: Remove or fix the `{progressMessages.map(...)}` JSX rendering block.
   - Ensure `npx tsc --noEmit` in `apps/frontend` completes with 0 errors.

   Fix 2 — Rule 12 Violations (Dummy Values) in `apps/frontend/src/app/investor-readiness/page.tsx`:
   - Line 118: Remove hardcoded `timeToReadiness: { expected: 4.2, bestCase: 2.8, worstCase: 7.5 }, // Dummy values`. Compute readiness timeline dynamically from financial metrics or return `null`.
   - Line 222: Remove hardcoded `grossMargin: 65, // Default average SaaS margin`. Compute gross margin dynamically from revenue/COGS in `cfoState` or return `0` / `null` when unconfigured.
   - Lines 433, 437, 439: Update UI display to render computed numbers or clean empty labels (`-` or `N/A`) when unconfigured, instead of fallback dummy numbers (`4.2`, `2.8`, `7.5`).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work.

4. Run build and test verifications:
   - Run `npx tsc --noEmit` in `apps/frontend` (MUST return exit code 0 with 0 TypeScript errors).
   - Run `npm --prefix apps/backend run test:e2e` (MUST pass exit code 0 across all test suites).

5. Write handoff report `s:\CFO\CFO\.agents\worker_m5_fix\handoff.md`.
6. Send completion message to parent (`91981a35-33bd-40dd-b7d4-1750ec7ffefe`) with your handoff location and verification results.
</USER_REQUEST>
