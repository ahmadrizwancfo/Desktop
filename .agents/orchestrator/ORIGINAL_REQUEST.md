# Original User Request

## Initial Request — 2026-07-27T10:22:36Z

# FounderCFO V19 — Production Hardening & Trust Layer

Objective: Prepare FounderCFO for production deployment while preserving existing functionality.

Working directory: s:\CFO\CFO

## Operating Rules
- **No Mock Data Rule (Critical)**: No mock, placeholder, or simulated financial data may be introduced into production code paths. If test fixtures are required, they must remain strictly isolated inside test directories (`scratch/` or `test/`). If any existing mock implementations are discovered in production code, report them before replacing or removing them.
- **Don't Optimize Prematurely Rule**: Meet performance budgets where feasible without introducing architectural complexity or reducing correctness. If a target cannot be achieved without significant redesign, document the bottleneck and propose an optimization strategy instead of implementing speculative optimizations.
- Do not redesign the Financial Engine, Canonical Model, Decision Engine, LiveStateEngine, or Tally integration.
- Preserve all existing APIs unless a security issue requires a change.
- Prefer targeted fixes over refactoring.
- Before modifying any file, identify why the change is required.
- Before implementation, produce a concise execution plan containing: files to be modified, reason for each modification, estimated implementation risk, rollback strategy, and expected user impact.
- Do not begin implementation until this execution plan is complete.

## Requirements

### R1. Workstream 1 — Reliability (Highest Priority)
Review `LiveStateEngineService`, `DecisionEngineService`, `TallyConnectorService`, and `SseService`. Identify and fix null dereferences, race conditions, event subscription leaks, duplicate event emissions, memory leaks, stale cached state, incorrect cleanup during shutdown, failures when organizations have zero transactions, and idempotency issues during repeated sync requests.

### R2. Workstream 2 — Security, Tenant Isolation & Production-Grade SSRF Protection
Verify every financial endpoint. Always derive `organizationId` from authenticated JWT context (`req.user.organizationId`). Reject cross-tenant access and validate every DTO. Implement production-grade SSRF protections for configurable Tally hosts, including:
- Protocol validation (allow only `http` / `https`)
- Hostname / IP validation (reject dangerous internal targets unless explicitly configured)
- Allow/deny rule enforcement
- HTTP redirect prevention
- Strict request timeouts
- Response payload size limits
Audit log Tally connection tests, sync requests, authentication failures, and authorization failures.

### R3. Workstream 3 — Real-Time UX & Component Performance Budgets
Improve the living dashboard UI with connection status indicators, live synchronization progress, optimistic updates, graceful reconnection after SSE disconnects, loading skeletons, smooth metric transitions, clear error states, and a subtle "last updated" timestamp.
Enforce Component Performance Budgets:
- LiveStateEngine refresh under 250ms where feasible without structural redesign.
- Decision Engine execution under 500ms.
- Tally synchronization progress streamed continuously.
- SSE reconnection under 2 seconds.

### R4. Workstream 4 — Production Readiness
Harden logging, exception handling, retry logic, timeout handling, and cancellation support. Ensure every integration fails gracefully.

### R5. Workstream 5 — Observability & Diagnostics
Instrument Decision Engine execution time, Financial Engine execution time, Tally sync duration, count of imported records, failed transformations, SSE active connections, and event processing latency with structured logs and telemetry metrics.

### R6. Workstream 6 — Rule-Based Financial Determinism
Verify that financial calculations remain deterministic wherever business rules are deterministic. Financial calculations, metrics, balances, forecasts (where rule-based), and canonical transformations must always produce identical outputs for identical inputs regardless of execution timing, retries, concurrency, or server restarts. AI-generated explanations may vary in wording but must never change the underlying financial facts or computed metrics. Identify and eliminate hidden non-deterministic behavior caused by asynchronous processing, event ordering, floating-point inconsistencies, caching, or race conditions.

### R7. Workstream 7 — Financial Data Integrity (P0)
Verify financial data integrity across the complete ingestion pipeline.
- Every imported transaction must have a stable immutable identifier.
- Duplicate imports must be detected and safely ignored.
- No transaction may disappear silently.
- Every imported record must be traceable back to its original source.
- Every transformation step must preserve auditability.
- Validate debit/credit consistency where applicable.
- Detect partial synchronization failures and recover safely.

## Acceptance Criteria

### Data Integrity & Reliability
- [ ] No duplicate transactions after repeated imports.
- [ ] Every `CanonicalTransaction` is traceable to its original source system.
- [ ] Partial synchronization failures are logged and safely recoverable.
- [ ] 0 crashes on empty organizations or cold starts.
- [ ] 0 duplicate financial events or SSE memory leaks.
- [ ] Rule-based financial metrics and balances produce identical outputs across concurrent runs and retries.
- [ ] 0 mock or placeholder financial data in production code paths.

### Security & SSRF
- [ ] Organization context derived strictly from JWT (`req.user.organizationId`).
- [ ] Cross-tenant access attempts rejected with 403 Forbidden.
- [ ] DTO validation enforced on all public and financial endpoints.
- [ ] Production-grade SSRF protections enforced (protocol checks, IP validation, redirect prevention, timeouts, size limits).
- [ ] Audit log entries generated for sensitive operations and security failures.

### User Experience & Performance Targets
- [ ] LiveStateEngine refresh under 250ms and Decision Engine execution under 500ms where feasible.
- [ ] SSE client reconnects automatically under 2 seconds with clear connection status indicators.
- [ ] Real-time operations display meaningful progress and "last updated" timestamp.
- [ ] Telemetry logs track execution latency, active SSE connections, and sync durations.

## Re-spawned Request — 2026-07-27T18:39:07Z

You are the re-spawned Project Orchestrator for FounderCFO V19 — Production Hardening & Trust Layer.
Your working directory is `s:\CFO\CFO\.agents\orchestrator`.

Please resume orchestration immediately:
1. Re-read `s:\CFO\CFO\.agents\orchestrator\BRIEFING.md`, `progress.md`, `plan.md`, and `PROJECT.md`.
2. Check the status of subagent handoffs in `.agents/` (e.g. `reviewer_m3`, `challenger_m3`, `auditor_m3` if existing, or inspect directory status).
3. Continue executing Phase 3 Milestones (M3 verification -> M4 Security & SSRF -> M5 UX -> M6 Observability -> M7 Determinism & Data Integrity -> M8 Final Integration).
4. Update `progress.md` and `BRIEFING.md` on every state change.
5. Notify Sentinel when all milestones are resolved and victory is claimed.

## Victory Audit Remediation Request — 2026-07-28T22:31:02+05:30

The independent Victory Auditor issued a verdict of **VICTORY REJECTED**.
Failure details: In `test/tier5-adversarial-hardening.e2e-spec.ts`, spec `1.1: LiveStateEngine DB refresh under full 100-request concurrency (< 250ms SLA)` recorded `maxDuration` = 869.84ms (failing the `< 250ms` assertion).

Please perform the following immediately:
1. Re-read `BRIEFING.md`, `progress.md`, `plan.md`, `PROJECT.md`, and `s:\CFO\CFO\.agents\victory_auditor\handoff.md`.
2. Update `progress.md` and `BRIEFING.md` to `IN_PROGRESS (Victory Audit Remediation Pass)`.
3. Dispatch a Worker subagent to optimize `LiveStateEngine` DB refresh / caching in `apps/backend/src/cfo-engine/live-state.engine.ts` so that concurrent refreshes execute under 250ms maxDuration under 100-request load.
4. Verify backend build (`npm --prefix apps/backend run build`), unit tests (`npm --prefix apps/backend test`), and E2E test suite (`npm --prefix apps/backend run test:e2e`) to confirm 100% pass (162/162 specs passing).
5. Update `progress.md` and notify Sentinel upon complete resolution and victory re-claim.


