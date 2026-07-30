# FounderCFO V19 — E2E Test Infrastructure & Methodology (`TEST_INFRA.md`)

## 1. Overview & Core Principles

This document establishes the E2E Testing Architecture and 4-Tier Methodology for **FounderCFO V19 — Production Hardening & Trust Layer**. 

### Key Principles
1. **Opaque-Box Requirement-Driven Strategy**: All test specs validate system behaviors strictly against the non-functional and functional requirements in `ORIGINAL_REQUEST.md` via external HTTP, SSE, and API contracts without relying on internal implementation hacks.
2. **Strict Test Isolation**: Test runners, spec suites, mock fixtures, and test utilities reside **exclusively** within isolated test paths (`apps/backend/test/`, `test/`, `scratch/`). Zero test fixtures or mock data are placed inside production code paths (`apps/backend/src/` or `apps/frontend/src/`), fulfilling the P0 No-Mock-Data Rule.
3. **Deterministic & Audit-Ready Verification**: Test cases verify financial calculation determinism, immutable transaction lineage, SSRF protections, tenant boundary isolation, and real-time performance SLA budgets.

---

## 2. Feature Inventory

The FounderCFO V19 system architecture is divided into seven core feature areas derived from Workstreams R1 to R7 in `ORIGINAL_REQUEST.md`:

| Feature ID | Feature Name | Core Scope & Responsibilities | Workstream Mapping |
|------------|--------------|--------------------------------|-------------------|
| **F1** | **LiveStateEngine & State Hydration** | Real-time financial state calculation, stale cache eviction, zero-transaction organization handling, refresh latency (<250ms). | WS1, WS3 |
| **F2** | **DecisionEngine & Autopilot Lifecycle** | Autonomous CFO decision lifecycle, decision execution (<500ms), deterministic rule evaluation, lifecycle phase transitions. | WS1, WS3, WS6 |
| **F3** | **TallyConnector & Ingestion Pipeline** | External Tally sync, XML payload parsing, canonical transformation, record lineage tracing, deduplication, debit/credit auditability. | WS1, WS2, WS7 |
| **F4** | **SseService & Real-Time UX Streaming** | Event stream emission, client connection management, automatic reconnection (<2s), subscription memory leak prevention, status indicators. | WS1, WS3, WS5 |
| **F5** | **Security, Tenant Isolation & SSRF** | JWT-based `organizationId` enforcement, cross-tenant 403 rejection, DTO payload validation, production-grade SSRF guardrails, audit logging. | WS2 |
| **F6** | **Production Readiness & Observability** | Graceful degradation under failure, structured JSON logging, execution telemetry metrics (latencies, record counts, active connections). | WS4, WS5 |
| **F7** | **Rule-Based Financial Determinism & P0 Integrity** | Immutable transaction IDs, deduplication guarantees, zero silent transaction loss, financial balance determinism across concurrent runs & restarts. | WS6, WS7 |

---

## 3. 4-Tier Test Case Design Methodology

Our E2E test suite structure follows a 4-Tier Hierarchy ensuring complete functional, edge-case, cross-functional, and real-world scenario validation.

```
       +-------------------------------------------------------+
       |   Tier 4: Real-World Application Scenarios            |
       |   (End-to-End Multi-User & System Recovery Flows)     |
       +-------------------------------------------------------+
       |   Tier 3: Cross-Feature Combinations                  |
       |   (Pairwise Feature Interaction Coverage)             |
       +-------------------------------------------------------+
       |   Tier 2: Boundary & Corner Cases                     |
       |   (>=5 Per Feature: Edge Conditions, Stress, SSRF)    |
       +-------------------------------------------------------+
       |   Tier 1: Feature Coverage                            |
       |   (>=5 Per Feature: Core Functional Verification)     |
       +-------------------------------------------------------+
```

---

### Tier 1: Feature Coverage (>=5 Test Cases Per Feature)

Tier 1 verifies primary functional capabilities under normal operating conditions.

#### Feature 1: LiveStateEngine & State Hydration
- `T1-F1-01`: GET `/api/cfo-engine/live-state` returns 200 OK with valid financial state object.
- `T1-F1-02`: Hydrates cached financial state correctly after valid data update.
- `T1-F1-03`: Invalidates stale cache upon receiving new canonical transaction events.
- `T1-F1-04`: Computes live runway and net cash flow accurately for active organization.
- `T1-F1-05`: Responds with correct updated state metrics when query parameter filters change.

#### Feature 2: DecisionEngine & Autopilot Lifecycle
- `T1-F2-01`: GET `/api/cfo-engine/decisions` returns list of active decision recommendations.
- `T1-F2-02`: POST `/api/cfo-engine/decisions/:id/execute` successfully triggers decision action.
- `T1-F2-03`: Updates decision lifecycle state from PENDING to EXECUTED or REJECTED.
- `T1-F2-04`: Generates deterministic decision recommendations for given financial inputs.
- `T1-F2-05`: Emits decision lifecycle status update event upon execution.

#### Feature 3: TallyConnector & Ingestion Pipeline
- `T1-F3-01`: POST `/api/integrations/tally/sync` initiates Tally synchronization workflow.
- `T1-F3-02`: Transforms Tally XML records into `CanonicalTransaction` models.
- `T1-F3-03`: Assigns stable immutable GUID identifiers to all imported transactions.
- `T1-F3-04`: Maps Tally voucher types to canonical debit/credit categories.
- `T1-F3-05`: Records source lineage metadata on imported canonical records.

#### Feature 4: SseService & Real-Time UX Streaming
- `T1-F4-01`: GET `/api/sse` establishes SSE connection with `text/event-stream` headers.
- `T1-F4-02`: Sends periodic heartbeat ping events to maintain client connection.
- `T1-F4-03`: Broadcasts live state updates to connected organization clients.
- `T1-F4-04`: Streams Tally sync progress status events during active ingestion.
- `T1-F4-05`: Disconnects inactive client connections cleanly without resource leakage.

#### Feature 5: Security, Tenant Isolation & SSRF
- `T1-F5-01`: Derives tenant context strictly from JWT `req.user.organizationId`.
- `T1-F5-02`: Rejects unauthenticated requests with 401 Unauthorized.
- `T1-F5-03`: Rejects cross-tenant access attempts with 403 Forbidden.
- `T1-F5-04`: Validates input DTO payloads on financial endpoints and rejects invalid schema (400 Bad Request).
- `T1-F5-05`: Emits structured audit log entries for authentication and authorization events.

#### Feature 6: Production Readiness & Observability
- `T1-F6-01`: GET `/health` returns 200 OK with uptime, timestamp, and system status.
- `T1-F6-02`: GET `/health/ready` returns readiness status of all internal services and database connections.
- `T1-F6-03`: Emits structured JSON log formatting with context IDs across HTTP requests.
- `T1-F6-04`: Exposes execution telemetry metrics for Decision Engine and Financial Engine.
- `T1-F6-05`: Recovers gracefully from downstream service connection timeouts without crashing.

#### Feature 7: Rule-Based Financial Determinism & P0 Integrity
- `T1-F7-01`: Financial balance calculation yields identical output across multiple sequential runs.
- `T1-F7-02`: Deduplication check detects and ignores identical duplicate transaction imports.
- `T1-F7-03`: Verifies total debits equal total credits across canonical ledger entries.
- `T1-F7-04`: Ensures 0 mock/placeholder data present in production response payloads.
- `T1-F7-05`: Retains full transaction auditability from source voucher to canonical ledger.

---

### Tier 2: Boundary & Corner Cases (>=5 Test Cases Per Feature)

Tier 2 verifies system robustness under extreme inputs, edge conditions, security probes, and concurrency stress.

#### Feature 1: LiveStateEngine & State Hydration
- `T2-F1-01`: Handles organizations with 0 transactions without throwing null dereference errors or crashing (returns 0 balances gracefully).
- `T2-F1-02`: LiveStateEngine refresh completes under 250ms SLA budget under peak data load.
- `T2-F1-03`: Handles sudden eviction of in-memory cache without serving corrupted or stale metrics.
- `T2-F1-04`: Evaluates extreme floating-point transaction amounts (e.g., $0.0000001 or $10^12) with exact precision.
- `T2-F1-05`: Prevents memory accumulation/leak when 1,000 rapid state queries are executed.

#### Feature 2: DecisionEngine & Autopilot Lifecycle
- `T2-F2-01`: DecisionEngine execution completes under 500ms SLA budget.
- `T2-F2-02`: Handles execution requests on already-executed or non-existent decision IDs (returns 400/404 cleanly).
- `T2-F2-03`: Maintains deterministic decision outputs when executed concurrently by multiple worker instances.
- `T2-F2-04`: Processes decision rules when organization data has conflicting or extreme variance indicators.
- `T2-F2-05`: Handles decision execution failure gracefully with proper transaction rollback and state restoration.

#### Feature 3: TallyConnector & Ingestion Pipeline
- `T2-F3-01`: Rejects oversized or malformed Tally XML payloads without crashing service.
- `T2-F3-02`: Detects and recovers safely from partial synchronization network drops midway through batch import.
- `T2-F3-03`: Prevents transaction duplication when identical sync request is submitted twice concurrently (idempotency guard).
- `T2-F3-04`: Handles special characters, non-ASCII text, and SQL injection strings in Tally voucher descriptions.
- `T2-F3-05`: Safely logs and isolates invalid individual vouchers without failing the entire sync batch.

#### Feature 4: SseService & Real-Time UX Streaming
- `T2-F4-01`: Client auto-reconnects and resumes SSE event stream under 2 seconds post disconnect.
- `T2-F4-02`: Prevents event subscription memory leak during rapid connect/disconnect cycles (100 connection drops).
- `T2-F4-03`: Drops duplicate event emissions to prevent duplicate UI state updates.
- `T2-F4-04`: Throttles high-frequency event bursts without dropping essential state change pings.
- `T2-F4-05`: Cleanly unsubscribes and cleans up channel listeners on server shutdown.

#### Feature 5: Security, Tenant Isolation & SSRF
- `T2-F5-01`: SSRF Guard rejects internal IP targets (`http://127.0.0.1`, `http://169.254.169.254`, `http://10.0.0.1`, `http://localhost`).
- `T2-F5-02`: SSRF Guard blocks non-HTTP protocols (`file://`, `gopher://`, `ftp://`).
- `T2-F5-03`: SSRF Guard blocks HTTP redirect chains targeting forbidden endpoints.
- `T2-F5-04`: Rejects requests with tampered or expired JWT tokens with 401.
- `T2-F5-05`: Rejects tenant ID manipulation in path or body when JWT organization ID differs.

#### Feature 6: Production Readiness & Observability
- `T2-F6-01`: System operates continuously without memory growth during 24-hour simulated load.
- `T2-F6-02`: Handles database connection drop and auto-reconnects cleanly without orphan processes.
- `T2-F6-03`: Telemetry logs track failed transformations, SSE connections count, and sync durations under load.
- `T2-F6-04`: Enforces API rate limiting on login/sensitive endpoints returning HTTP 429 when threshold breached.
- `T2-F6-05`: Catches uncaught exceptions in async background tasks without unhandled promise rejections.

#### Feature 7: Rule-Based Financial Determinism & P0 Integrity
- `T2-F7-01`: Financial balance calculations maintain identical outputs across cold restarts and cache clears.
- `T2-F7-02`: Re-importing 10,000 existing transactions results in exactly 0 new records inserted (100% deduplication).
- `T2-F7-03`: Rejects unbalanced double-entry vouchers (debit != credit) during canonical ingestion.
- `T2-F7-04`: Guarantees transaction ID immutability under concurrent update attempts.
- `T2-F7-05`: Verifies AI explanation variations do NOT alter underlying financial numbers or deterministic metrics.

---

### Tier 3: Cross-Feature Combinations (Pairwise Interaction Coverage)

Tier 3 validates interaction boundaries between multiple features executing concurrently.

| Test Case ID | Feature Pair | Combination Description & Verification |
|--------------|--------------|-----------------------------------------|
| `T3-MX-01` | **F3 (Tally) + F4 (SSE) + F1 (LiveState)** | Triggering a Tally sync streams real-time ingestion progress via SSE, updates canonical transactions, and triggers an automatic LiveStateEngine cache refresh (<250ms). |
| `T3-MX-02` | **F5 (Security) + F3 (Tally SSRF) + F6 (Audit Logs)** | An SSRF attack attempt targeting `http://169.254.169.254` during Tally connection configuration is blocked by SSRF guards and generates an immutable security audit log entry. |
| `T3-MX-03` | **F1 (LiveState Zero Tx) + F2 (DecisionEngine) + F7 (Determinism)** | An organization with 0 transactions generates deterministic 0-balance LiveState metrics and triggers safe zero-data decision recommendations without throwing exceptions. |
| `T3-MX-04` | **F5 (Tenant Isolation) + F1 (LiveState) + F4 (SSE)** | SSE stream emissions for Tenant A are strictly isolated and never broadcasted to Tenant B's active SSE connection listeners. |
| `T3-MX-05` | **F3 (Tally Ingestion) + F7 (Deduplication) + F4 (SSE Progress)** | Repeated sync of duplicate Tally vouchers progress-streams via SSE, skips duplicate inserts, and preserves ledger debit/credit balance integrity. |
| `T3-MX-06` | **F2 (Decision Execution) + F6 (Observability) + F4 (SSE)** | Executing a decision recommendation records execution latency telemetry in structured logs and broadcasts an SSE decision execution event to dashboard clients. |

---

### Tier 4: Real-World Application Scenarios

Tier 4 simulates multi-step, production-grade end-to-end user workflows and operational journeys.

#### Scenario 1: Complete Onboarding, Ingestion & Real-Time CFO Dashboard Journey (`T4-SC-01`)
1. User registers new organization account and authenticates via JWT.
2. Configures valid external Tally connector host.
3. Triggers initial Tally sync; verifies SSE streams progress events from 0% to 100%.
4. Verifies canonical transactions created with stable immutable GUIDs and complete source lineage.
5. Queries `/api/cfo-engine/live-state`; verifies live metrics refresh in <250ms.
6. Fetches DecisionEngine recommendations; verifies execution response under <500ms.
7. Executes recommendation; verifies state update broadcasted via SSE.
8. Inspects audit log endpoints; verifies all steps logged cleanly.

#### Scenario 2: Security Attack & SSRF Resilience Under Load (`T4-SC-02`)
1. Attacker attempts cross-tenant request with forged JWT; receives 403 Forbidden.
2. Attacker attempts SSRF probes targeting AWS IMDS (`169.254.169.254`), internal loopback (`127.0.0.1`), and internal LAN (`10.0.0.1`); all blocked by SSRF guards.
3. Attacker attempts SQL injection and malformed XML in sync DTO payload; rejected with 400 Bad Request.
4. Attacker launches burst of 100 rapid login attempts; rate limiter triggers 429 Too Many Requests.
5. Verifies audit logs record all security violation attempts with IP, timestamp, and user context.

#### Scenario 3: Network Interruption, SSE Auto-Reconnect & Data Deduplication (`T4-SC-03`)
1. Client connects to SSE event stream; receives live heartbeats.
2. Tally sync is initiated; midway through sync, network connection drops.
3. System logs partial sync failure safely without corrupting database state.
4. Client SSE connection auto-reconnects under 2 seconds.
5. User re-initiates Tally sync; system deduplicates previously imported records and completes sync.
6. Verifies final financial balances equal exact expected deterministic total.

#### Scenario 4: Multi-Tenant Zero-Tx Cold Start & Telemetry Audit (`T4-SC-04`)
1. Create Organization A (10,000 transactions) and Organization B (0 transactions) simultaneously.
2. Query LiveState and Decision Engine concurrently for both orgs.
3. Verify Org B returns zero balances with 0 crashes or null pointer dereferences.
4. Verify Org A returns deterministic calculations under performance budgets (LiveState <250ms, Decision <500ms).
5. Verify structured telemetry logs log latency metrics, imported record counts, and active SSE connection counts.

---

## 4. Test Runner & Execution Setup

### Configuration Files
- **Test Specs Path**: `apps/backend/test/`
- **Jest E2E Config**: `apps/backend/test/jest-e2e.json`
- **Execution Script**: `npm --prefix apps/backend run test:e2e`

### Directory Layout Guarantee
- Production paths (`apps/backend/src/`, `apps/frontend/src/`) contain **NO** test fixtures or test code.
- Test specs, helpers, and mocks are located exclusively in:
  - `apps/backend/test/`
  - `scratch/`

---

## 5. Summary Matrix of Test Suite Coverage

| Tier | Focus Area | Total Specs | Target SLA / Budget | Isolation Path |
|------|------------|-------------|---------------------|----------------|
| **Tier 1** | Feature Coverage (>=5 / feature) | 35 Specs | Functionality 100% | `apps/backend/test/` |
| **Tier 2** | Boundary & Corner Cases (>=5 / feature) | 35 Specs | SSRF, Zero-Tx, Latency Budgets | `apps/backend/test/` |
| **Tier 3** | Cross-Feature Interactions | 6 Specs | Pairwise Integration | `apps/backend/test/` |
| **Tier 4** | Real-World Application Scenarios | 4 Scenarios | End-to-End Workflows | `apps/backend/test/` |
| **Total** | **Complete FounderCFO V19 Suite** | **80 E2E Specs** | **Production Ready** | **Isolated Test Directories** |
