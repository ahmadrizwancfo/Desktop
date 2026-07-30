# FounderCFO V19 — Production Hardening & Trust Layer Detailed Execution Plan

## Executive Summary
This execution plan satisfies Requirement 18 & Strict Operating Rule 4. It synthesizes full code exploration from Backend, Security, Data Integrity, UX, Performance, and Observability audits. No production code will be modified until this execution plan is finalized and recorded.

---

## Operating Rules Compliance
1. **No Mock Data Rule (Critical)**: Purge all 13 identified mock data files (3 backend, 10 frontend) from production code paths. Isolated test fixtures remain strictly inside `apps/backend/test/` or `scratch/`.
2. **Don't Optimize Prematurely Rule**: Target performance budgets (LiveStateEngine <250ms, DecisionEngine <500ms) strictly via non-structural query parallelization (`Promise.all`) and DB write batching (`prisma.$transaction`).
3. **Core Architecture Protection**: Preserve Financial Engine, Canonical Model, Decision Engine, LiveStateEngine, and Tally integration interfaces. Targeted, minimal diffs only.
4. **Execution Plan Gate**: This document defines the exact target files, reasons for modification, risk assessment, rollback strategy, and user impact prior to implementation.

---

## Detailed Execution Plan Table (Files to Modify)

| # | Workstream | Target File | Reason for Modification | Risk | Rollback Strategy | User Impact |
|---|---|---|---|---|---|---|
| 1 | **Rule 12 & WS1** | `apps/backend/src/integrations/tally/tally-connector.service.ts` | Remove mock voucher array (`rawVouchers`). Connect to `TallyClient.sendTallyXmlRequest` for live voucher parsing and add deduplication check before event emission. | Low | `git checkout apps/backend/src/integrations/tally/tally-connector.service.ts` | Prevents fake Tally transactions from polluting production DB. |
| 2 | **Rule 12** | `apps/backend/src/bank-accounts/bank-sync/bank-sync.service.ts` | Replace `MockICICIProvider` execution with real production banking interface guard returning explicit unconfigured status. | Low | `git checkout apps/backend/src/bank-accounts/bank-sync/bank-sync.service.ts` | Eliminates fake ICICI bank transactions. |
| 3 | **Rule 12** | `apps/backend/src/integrations/quickbooks.service.ts` | Remove hardcoded mock QBO invoice and expense arrays from `syncAccount`. Return clean sync status when unconfigured. | Low | `git checkout apps/backend/src/integrations/quickbooks.service.ts` | Eliminates fake Quickbooks transactions. |
| 4 | **WS1 & WS3** | `apps/backend/src/cfo-engine/live-state.engine.ts` | Remove non-null assertion `!`, remove duplicate `.on()` event bindings, parallelize `hydrateStateFromDb` (`Promise.all` for <80ms refresh), add LRU cache bound and `OnModuleDestroy` cleanup. | Low | `git checkout apps/backend/src/cfo-engine/live-state.engine.ts` | Prevents engine crashes, fixes memory leak, speeds up live state refresh to <80ms. |
| 5 | **WS1 & WS5** | `apps/backend/src/sse/sse.service.ts` | Add subscriber auto-pruning when count reaches 0, complete subjects on NestJS module destroy, and add active SSE connection metric telemetry. | Low | `git checkout apps/backend/src/sse/sse.service.ts` | Eliminates SSE process memory leaks and enables connection monitoring. |
| 6 | **WS1, WS3, WS5** | `apps/backend/src/cfo-engine/decision-engine.service.ts` | Guard against `NaN`/`Infinity` on zero-transaction/zero-cash orgs, batch decision DB writes via `prisma.$transaction` (<200ms budget), and add `[TELEMETRY]` execution time logging. | Medium | `git checkout apps/backend/src/cfo-engine/decision-engine.service.ts` | Prevents crashes on empty orgs, ensures <500ms decision SLA, adds telemetry. |
| 7 | **WS2** | `apps/backend/src/cfo-engine/cfo-engine.controller.ts` | Reject cross-tenant access on `@Get('live-state/:orgId')` by enforcing match against `req.user.organizationId` (return 403 Forbidden on mismatch). | Low | `git checkout apps/backend/src/cfo-engine/cfo-engine.controller.ts` | Secures live financial state against unauthorized cross-tenant viewing. |
| 8 | **WS2** | `apps/backend/src/financial-metrics/financial-metrics.controller.ts` | Replace unauthenticated route `:orgId` params with `@GetUser('organizationId')` check across `:orgId/latest`, `:orgId/dashboard`, `:orgId/history`. | Low | `git checkout apps/backend/src/financial-metrics/financial-metrics.controller.ts` | Prevents unauthorized tenant metric reads. |
| 9 | **WS2** | `apps/backend/src/bank-accounts/bank-accounts.controller.ts` | Enforce `organizationId` from `req.user.organizationId` in `findAll` and check account ownership on sync endpoints. | Low | `git checkout apps/backend/src/bank-accounts/bank-accounts.controller.ts` | Protects tenant bank account visibility and actions. |
| 10 | **WS2** | `apps/backend/src/invoices/invoices.controller.ts` | Override `createInvoiceDto.organizationId` with authenticated `req.user.organizationId` in `create()`. | Low | `git checkout apps/backend/src/invoices/invoices.controller.ts` | Prevents cross-tenant invoice creation injections. |
| 11 | **WS2 & WS4** | `apps/backend/src/integrations/tally/tally-client.ts` | Add SSRF guard `validateTallyHostUrl`: HTTP/HTTPS protocol validation, DNS resolution & internal/loopback IP rejection, disable redirects, 5s timeout (`AbortSignal.timeout`), 5MB response cap, audit logging. | Medium | `git checkout apps/backend/src/integrations/tally/tally-client.ts` | Blocks SSRF attacks against internal network/cloud metadata services. |
| 12 | **WS2 & WS5** | `apps/backend/src/auth/jwt.strategy.ts` | Update `JwtStrategy` to extract JWT token from URL query param `?token=` to enable browser SSE authentication. | Low | `git checkout apps/backend/src/auth/jwt.strategy.ts` | Restores SSE authentication and streaming for browser clients. |
| 13 | **WS4 & WS5** | `apps/backend/src/common/filters/global-exception.filter.ts` | Inject `x-correlation-id` UUID response header and format structured JSON error logs. | Low | `git checkout apps/backend/src/common/filters/global-exception.filter.ts` | Improves production error diagnostics and request correlation. |
| 14 | **WS6** | `apps/backend/src/events/workers/reconciliation.worker.ts` | Round monetary additions to two decimal places (`roundToTwoDecimals`) to prevent IEEE 754 floating-point precision drift across retries. | Low | `git checkout apps/backend/src/events/workers/reconciliation.worker.ts` | Guarantees deterministic financial metrics across runs. |
| 15 | **WS7** | `apps/backend/src/integrations/tally/tally-transformer.service.ts` | Replace fallback `Date.now()` with stable deterministic SHA-256 hash derived from `orgId + voucherNumber + amount + date`. | Low | `git checkout apps/backend/src/integrations/tally/tally-transformer.service.ts` | Guarantees transaction ID immutability & deduplication. |
| 16 | **Rule 12** | `apps/frontend/src/services/financial-service.ts` | Remove `MOCK_DASHBOARD_DATA` export; return explicit empty state object when API is unconfigured. | Low | `git checkout apps/frontend/src/services/financial-service.ts` | Prevents hardcoded mock numbers in dashboard services. |
| 17 | **Rule 12** | `apps/frontend/src/app/investor-readiness/page.tsx` | Remove fallback to `mockMetrics` & `mockReadiness`. Display explicit zero/empty states. | Low | `git checkout apps/frontend/src/app/investor-readiness/page.tsx` | Eliminates fake investor readiness scores. |
| 18 | **Rule 12** | `apps/frontend/src/app/settings/audit-trail/page.tsx` | Remove fallback to `mockAuditLogs`. Display empty table state with error message. | Low | `git checkout apps/frontend/src/app/settings/audit-trail/page.tsx` | Eliminates fake audit logs. |
| 19 | **Rule 12** | `apps/frontend/src/app/unit-economics/page.tsx` | Remove `mockMetrics`, `mockDecisions`, `mockCohorts` fallbacks. Render empty state notice. | Low | `git checkout apps/frontend/src/app/unit-economics/page.tsx` | Eliminates fake CAC/LTV unit economics numbers. |
| 20 | **Rule 12** | `apps/frontend/src/components/dashboard/cash-flow-forecast.tsx` | Remove `DefaultCashFlowForecast` component rendering hardcoded Feb/Mar cash flows. | Low | `git checkout apps/frontend/src/components/dashboard/cash-flow-forecast.tsx` | Removes fake cash flow forecast display. |
| 21 | **Rule 12** | `apps/frontend/src/components/dashboard/cfo-resolution-center.tsx` | Replace hardcoded `avgSalary = 85000` with payroll transaction calculation or empty prompt. | Medium | `git checkout apps/frontend/src/components/dashboard/cfo-resolution-center.tsx` | Ensures accurate statutory reserve calculations. |
| 22 | **Rule 12** | `apps/frontend/src/components/dashboard/monthly-comparison.tsx` | Remove `DefaultMonthlyComparison` mock wrapper rendering fake monthly metrics. | Low | `git checkout apps/frontend/src/components/dashboard/monthly-comparison.tsx` | Removes fake monthly comparison metrics. |
| 23 | **Rule 12** | `apps/frontend/src/components/dashboard/why-drill-down.tsx` | Replace `generateDrillDownData` mock function with real backend drill-down API response parsing. | Medium | `git checkout apps/frontend/src/components/dashboard/why-drill-down.tsx` | Connects drill-down views to real financial transactions. |
| 24 | **Rule 12** | `apps/frontend/src/app/(dashboard)/integrations/page.tsx` | Remove `handleMockConnect` and timer simulation. Connect to real OAuth / backend Tally API. | Low | `git checkout apps/frontend/src/app/(dashboard)/integrations/page.tsx` | Replaces fake integration connection simulations. |
| 25 | **WS3** | `apps/frontend/src/hooks/use-living-dashboard.ts` | Pass JWT token as URL query param `?token=` to `EventSource` to resolve HTTP 401 SSE connection failure. | Low | `git checkout apps/frontend/src/hooks/use-living-dashboard.ts` | Restores real-time SSE updates on dashboard. |
| 26 | **WS3** | `apps/frontend/src/app/(dashboard)/dashboard/page.tsx` & `header.tsx` | Add SSE connection status badge ("Live" / "Reconnecting"), sync progress bar, and "Updated X seconds ago" timestamp label. | Low | `git checkout apps/frontend/src/app/(dashboard)/dashboard/page.tsx` | Provides transparent real-time status to users. |

---

## Milestone Execution Sequence

### Milestone 1 (M3): Reliability & Backend Mock Cleanup (WS1 + Rule 12 Backend)
- Target Files: `tally-connector.service.ts`, `bank-sync.service.ts`, `quickbooks.service.ts`, `live-state.engine.ts`, `sse.service.ts`, `decision-engine.service.ts`.
- Goals: Purge backend mock data, eliminate null dereferences, fix memory leaks, fix zero-transaction org handling.

### Milestone 2 (M4): Security, Tenant Isolation & Production-Grade SSRF (WS2)
- Target Files: `cfo-engine.controller.ts`, `financial-metrics.controller.ts`, `bank-accounts.controller.ts`, `invoices.controller.ts`, `tally-client.ts`, `jwt.strategy.ts`.
- Goals: Derive `orgId` strictly from JWT, validate DTOs, implement SSRF guardrails on Tally client (protocol, IP/hostname, redirect, timeout, size limit, audit logs).

### Milestone 3 (M5): Real-Time UX, Performance Budgets & Frontend Mock Cleanup (WS3 + Rule 12 Frontend)
- Target Files: `financial-service.ts`, `investor-readiness/page.tsx`, `audit-trail/page.tsx`, `unit-economics/page.tsx`, `cash-flow-forecast.tsx`, `cfo-resolution-center.tsx`, `monthly-comparison.tsx`, `why-drill-down.tsx`, `integrations/page.tsx`, `use-living-dashboard.ts`, `dashboard/page.tsx`, `header.tsx`.
- Goals: Purge frontend mock fallbacks, restore SSE stream with token query param, add SSE status indicators/timestamps, verify LiveStateEngine <250ms and DecisionEngine <500ms SLAs.

### Milestone 4 (M6): Production Readiness & Observability (WS4 + WS5)
- Target Files: `tally-client.ts` (retry/timeout), `global-exception.filter.ts` (correlation ID & structured JSON logging), `decision-engine.service.ts` & `sse.service.ts` (telemetry execution metrics).
- Goals: Graceful degradation, correlation tracing, structured telemetry logging.

### Milestone 5 (M7): Financial Determinism & Data Integrity (WS6 + WS7 - P0)
- Target Files: `reconciliation.worker.ts` (monetary rounding), `tally-transformer.service.ts` (SHA-256 stable IDs), `tally-connector.service.ts` (ingestion deduplication & partial sync recovery).
- Goals: 100% financial determinism, immutable transaction IDs, deduplication, auditability.

### Final Integration Milestone (M8): E2E Test Suite Validation & Forensic Audit
- Execute full 93-spec E2E test suite (`npm --prefix apps/backend run test:e2e`).
- Execute Tier 5 Adversarial Coverage Hardening.
- Dispatch `teamwork_preview_auditor` for forensic integrity check (verify zero mock data in production, clean audit verdict).
