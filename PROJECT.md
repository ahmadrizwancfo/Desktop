# Project: FounderCFO V19 — Production Hardening & Trust Layer

## Architecture
- **Monorepo**: NestJS Backend (`apps/backend`) and Next.js / React Frontend (`apps/frontend`).
- **Core Services**: `LiveStateEngineService`, `DecisionEngineService`, `TallyConnectorService`, `SseService`, `FinancialEngineService`.
- **Data Flow**: Ingestion -> TallyConnector -> Canonical Transformation -> Financial Engine / LiveStateEngine -> Decision Engine -> Real-Time SSE / REST API.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: System Exploration & Analysis | Audit 7 workstreams, locate bugs, detect mock data | None | DONE |
| 2 | M2: E2E Test Suite Creation | Design 4-tier opaque box E2E test suite (`TEST_READY.md`) | None | DONE |
| 3 | M3: Reliability & Concurrency Hardening | Purge backend mock data, fix null derefs, memory leaks, zero-tx orgs | M1 | DONE |
| 4 | M4: Security, Tenant Isolation & Production-Grade SSRF Protection | JWT tenant isolation, DTO validation, SSRF guardrails, security audit logs | M1, M3 | DONE |
| 5 | M5: Real-Time UX & Performance Budgets | Purge frontend mock fallbacks, SSE query auth, status UI, LiveState <250ms & Decision <500ms budgets | M1, M3, M4 | DONE |
| 6 | M6: Production Readiness & Observability | Graceful degradation, correlation ID tracing, structured telemetry logging | M1, M3, M4, M5 | DONE |
| 7 | M7: Financial Determinism & Data Integrity | P0 integrity, SHA-256 stable IDs, deduplication, debit/credit auditability | M1, M3, M4, M5, M6 | DONE |
| 8 | M8: Final Integration & Forensic Audit | 100% E2E test pass (145/145 specs) + Tier 5 Adversarial Coverage Hardening & Forensic Integrity Audit | M2-M7 | DONE |

## Interface Contracts
### Client ↔ Server (SSE & REST)
- DTO validation strictly enforced on all public and financial endpoints.
- `req.user.organizationId` derived strictly from JWT context.
- SSE connection authentication supported via `Authorization: Bearer <token>` or `?token=<token>` query param.
- Event stream format: typed SSE payload with heartbeat and relative timestamp.

### Backend ↔ Tally Host (SSRF Security Contract)
- Protocols: `http`, `https` only.
- Target verification: Reject unroutable/internal/private/loopback IPs (DNS resolution check).
- Redirects: Disabled. Timeouts: 5s max limit (`AbortSignal.timeout(5000)`). Payload limit: 5MB cap.
- Security Audit Log: All connection tests and failures logged to `AuditLog`.

## Code Layout
- `apps/backend/src/` — NestJS services, controllers, DTOs, modules
- `apps/frontend/src/` — React components, dashboard UI, SSE hooks
- `apps/backend/test/` — Opaque-box E2E test suites (145 specs across 9 test suites)
