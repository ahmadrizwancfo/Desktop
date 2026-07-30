## 2026-07-28T11:37:06Z
<USER_REQUEST>
You are auditor_m8, the Final Forensic Integrity Auditor for FounderCFO V19 — Production Hardening & Trust Layer (Milestone M8).
Your working directory is `s:\CFO\CFO\.agents\auditor_m8`.

TASK:
1. Initialize `BRIEFING.md` and `progress.md` in `s:\CFO\CFO\.agents\auditor_m8`.
23: 
24: ## 2026-07-28T17:08:20Z
25: <USER_REQUEST>
26: You are the Forensic Integrity Auditor for FounderCFO V19 Milestone M8 (Final System Forensic Audit).
27: Your working directory is s:\CFO\CFO\.agents\auditor_m8.
28: Please create your working directory s:\CFO\CFO\.agents\auditor_m8 if it doesn't exist, and create your BRIEFING.md and progress.md.
29: 
30: Read s:\CFO\CFO\.agents\ORIGINAL_REQUEST.md, s:\CFO\CFO\PROJECT.md, s:\CFO\CFO\.agents\orchestrator\plan.md, and all prior worker handoff reports.
31: 
32: Perform the Final Forensic Integrity Audit across the entire FounderCFO V19 codebase (`apps/backend/src/` and `apps/frontend/src/`):
33: 1. Verify Operating Rule 12: Zero mock, placeholder, dummy, or simulated financial data in production code paths.
34: 2. Check for any cheating, fake test passes, dummy implementations, hardcoded return values, or bypassed logic across all 7 workstreams.
35: 3. Run `npm --prefix apps/backend run build`, `cd apps/frontend && npx tsc --noEmit`, and `npm --prefix apps/backend run test:e2e`.
36: 
37: Render an explicit binary audit verdict:
38: - **CLEAN**: No integrity violations, authentic implementation across all 7 workstreams.
39: - **INTEGRITY VIOLATION**: Any mock data, fake implementation, or cheating detected.
40: 
41: Write your full evidence report and verdict to `s:\CFO\CFO\.agents\auditor_m8\handoff.md`.
42: Report back via send_message when complete with your explicit verdict.
43: </USER_REQUEST>
Read system context files: `s:\CFO\CFO\PROJECT.md`, `s:\CFO\CFO\.agents\orchestrator\plan.md`, `s:\CFO\CFO\.agents\worker_m7\handoff.md`.
3. Perform final system-wide forensic integrity audit across the ENTIRE repository (`apps/backend` and `apps/frontend`):
   - Inspect source code for Operating Rule 12 compliance: ZERO mock data, ZERO simulated financial numbers, ZERO placeholder fallbacks, ZERO fake facade implementations.
   - Verify tenant isolation enforcement across all backend endpoints.
   - Verify SSRF guardrails in `tally-client.ts`.
   - Verify correlation ID header injection (`x-correlation-id`) and structured JSON error logging.
   - Verify two-decimal monetary rounding (`roundToTwoDecimals`) in `reconciliation.worker.ts` and deterministic SHA-256 fallback transaction IDs in `tally-transformer.service.ts`.
4. Run full build and test verifications:
   - `npm --prefix apps/backend run build`
   - `npx tsc --noEmit` in `apps/frontend`
   - `npm --prefix apps/backend test`
   - `npm --prefix apps/backend run test:e2e` (all 145 specs across 9 test suites must pass)
5. Write final forensic audit report `s:\CFO\CFO\.agents\auditor_m8\handoff.md` with explicit verdict: CLEAN or INTEGRITY VIOLATION.
6. Send message to parent (`91981a35-33bd-40dd-b7d4-1750ec7ffefe`) with your final audit verdict.
</USER_REQUEST>
