## 2026-07-27T23:48:43Z
You are the Production Readiness & Observability Worker for FounderCFO V19.
Your working directory is s:\CFO\CFO\.agents\worker_m6.
Please create your working directory s:\CFO\CFO\.agents\worker_m6 if it doesn't exist, and create your BRIEFING.md and progress.md.

Read s:\CFO\CFO\.agents\ORIGINAL_REQUEST.md, s:\CFO\CFO\PROJECT.md, and s:\CFO\CFO\.agents\orchestrator\plan.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your objective is to execute Milestone M6 (Production Readiness & Observability Telemetry):
1. Workstream 4 — Production Readiness:
   - `apps/backend/src/integrations/tally/tally-client.ts`: Add exponential backoff retry logic (3 attempts with jitter) and enforce `AbortSignal.timeout(5000)` per attempt.
   - `apps/backend/src/common/filters/global-exception.filter.ts`: Inject request correlation ID (`x-correlation-id`) UUID header into all HTTP response headers. Log structured JSON error events.
   - `apps/backend/src/cfo-engine/decision-engine.service.ts`: Wrap async `@OnEvent` listeners in `try-catch` blocks to eliminate uncaught promise rejections.
2. Workstream 5 — Observability & Telemetry Instrumentation:
   - `apps/backend/src/cfo-engine/decision-engine.service.ts`: Instrument execution time logging: `[TELEMETRY] DecisionEngine: duration X ms`.
   - `apps/backend/src/integrations/tally/tally-connector.service.ts`: Instrument sync metrics: `[TELEMETRY] TallySync: duration X ms, imported Y records, duplicate Z records`.
   - `apps/backend/src/sse/sse.service.ts`: Instrument active SSE connections count gauge: `[TELEMETRY] SSE Active Connections: N`.
   - Financial Engine / LiveStateEngine: Log event processing latency and execution duration.

After implementation:
- Run backend compilation (`npm --prefix apps/backend run build`).
- Run backend unit and E2E test suites (`npm --prefix apps/backend test` and `npm --prefix apps/backend run test:e2e`).
- Write your handoff report to `s:\CFO\CFO\.agents\worker_m6\handoff.md`.
- Report back via send_message when complete.

## 2026-07-27T18:20:11Z
**Context**: Milestone M6 Execution (Production Readiness & Observability - Workstreams 4 & 5).
**Content**: Please execute all M6 tasks across backend services:

1. **Workstream 4 (Production Readiness)**:
   - `apps/backend/src/integrations/tally/tally-client.ts`: Implement retry logic with exponential backoff for transient network glitches, 5000ms strict timeout (`AbortSignal.timeout(5000)`), and graceful error handling on unreachable Tally host.
   - `apps/backend/src/common/filters/global-exception.filter.ts`: Inject `x-correlation-id` UUID header into HTTP responses (use incoming request header if present, else generate fresh UUID). Log structured JSON errors including correlation ID, timestamp, path, method, and status code.
   - `apps/backend/src/cfo-engine/decision-engine.service.ts`: Wrap all async `@OnEvent` listeners in try-catch blocks to guarantee zero unhandled promise rejections / process crashes.

2. **Workstream 5 (Observability & Diagnostics)**:
   - `apps/backend/src/cfo-engine/decision-engine.service.ts`: Instrument telemetry log `[TELEMETRY] DecisionEngine: duration=Xms, decisionsCount=Y, orgId=Z`.
   - `apps/backend/src/integrations/tally/tally-connector.service.ts`: Instrument telemetry log `[TELEMETRY] TallySync: duration=Xms, importedRecords=Y, duplicateRecords=Z, orgId=A`.
   - `apps/backend/src/sse/sse.service.ts`: Instrument telemetry log `[TELEMETRY] SSE Active Connections: N (orgId=...)` on client connect, disconnect, and subscriber auto-pruning.
   - `apps/backend/src/cfo-engine/live-state.engine.ts`: Instrument telemetry log `[TELEMETRY] LiveStateHydration: duration=Xms`.

Mandatory Integrity Warning: DO NOT CHEAT. All implementations must be genuine.
When complete:
- Run NestJS backend build (`npm --prefix apps/backend run build`).
- Run backend unit tests (`npm --prefix apps/backend run test`).
- Run E2E test suite (`npm --prefix apps/backend run test:e2e`).
- Write `handoff.md` in `s:\CFO\CFO\.agents\worker_m6`.
- Send completion message to parent.
**Action**: Implement M6 fixes now and report back with build & test verification results.

