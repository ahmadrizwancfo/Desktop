## 2026-07-28T11:27:15Z
<USER_REQUEST>
You are auditor_m6, a Forensic Auditor subagent for Milestone M6 (Production Readiness & Observability).
Your working directory is `s:\CFO\CFO\.agents\auditor_m6`.

TASK:
1. Initialize `BRIEFING.md` and `progress.md` in `s:\CFO\CFO\.agents\auditor_m6`.
2. Read system context files: `s:\CFO\CFO\PROJECT.md`, `s:\CFO\CFO\.agents\orchestrator\plan.md`, `s:\CFO\CFO\.agents\worker_m6\handoff.md`.
3. Perform forensic integrity verification on M6 code modifications:
   - Inspect `tally-client.ts`, `global-exception.filter.ts`, `decision-engine.service.ts`, `tally-connector.service.ts`, `sse.service.ts`, `live-state.engine.ts`.
   - Verify Operating Rule 12 compliance (zero mock data, zero hardcoded telemetry shortcuts).
   - Verify authentic implementation of correlation ID tracing and exponential retry logic.
4. Run build and E2E tests:
   - `npm --prefix apps/backend run build`
   - `npm --prefix apps/backend run test:e2e` (all 137 specs must pass)
5. Write forensic audit handoff report `s:\CFO\CFO\.agents\auditor_m6\handoff.md` with explicit verdict: CLEAN or INTEGRITY VIOLATION.
6. Send message to parent (`413faddd-07f4-48bd-b71b-10fad7c754c2`) with your audit verdict.
</USER_REQUEST>

## 2026-07-28T11:27:28Z
<USER_REQUEST>
You are the Forensic Integrity Auditor for FounderCFO V19 Milestone M6.
Your working directory is s:\CFO\CFO\.agents\auditor_m6.
Please create your working directory s:\CFO\CFO\.agents\auditor_m6 if it doesn't exist, and create your BRIEFING.md and progress.md.

Read s:\CFO\CFO\.agents\ORIGINAL_REQUEST.md, s:\CFO\CFO\PROJECT.md, s:\CFO\CFO\.agents\orchestrator\plan.md, and s:\CFO\CFO\.agents\worker_m6\handoff.md.

Perform a strict Forensic Integrity Audit on Milestone M6 changes in `apps/backend/src/`:
1. Inspect `tally-client.ts`, `global-exception.filter.ts`, `decision-engine.service.ts`, `tally-connector.service.ts`, `sse.service.ts`, `live-state.engine.ts`.
2. Check for any cheating, fake passes, dummy implementations, or hardcoded return values.
3. Verify Operating Rule 12: Zero mock or placeholder financial data in production code paths.
4. Run `npm --prefix apps/backend run build` and `npm --prefix apps/backend run test:e2e`.

Render an explicit binary audit verdict:
- **CLEAN**: No integrity violations, authentic implementation.
- **INTEGRITY VIOLATION**: Any mock data, fake implementation, or cheating detected.

Write your full evidence report and verdict to `s:\CFO\CFO\.agents\auditor_m6\handoff.md`.
Report back via send_message when complete with your explicit verdict.
</USER_REQUEST>
