# Audit & Exploration Report: FounderCFO V19 Backend
**Workstreams**: WS1 (Reliability), WS2 (Security & SSRF), WS6 (Financial Determinism), WS7 (Financial Data Integrity), Critical Rule 12 (No Mock Data)  
**Agent**: Backend, Security & Data Integrity Explorer (`explorer_ws1267`)  
**Target Path**: `apps/backend/src/`  
**Date**: 2026-07-27  

---

## Executive Summary

A comprehensive read-only code audit of `apps/backend/src/` was conducted across Workstreams 1, 2, 6, 7 and Critical Operating Rule 12. Significant vulnerabilities and bugs were discovered across all five domains:
1. **Critical Operating Rule 12 Violations (Mock Data in Production)**: Discovered hardcoded mock financial transaction payloads and mock banking/accounting providers in active production code paths in `TallyConnectorService`, `BankSyncService`, and `QuickbooksService`.
2. **Workstream 1 (Reliability & Memory Leaks)**: Discovered non-null assertions, unbounded RxJS subject maps in `SseService` causing connection memory leaks, duplicate event listener registrations in `LiveStateEngineService`, and missing graceful shutdown hooks.
3. **Workstream 2 (Security, Tenant Isolation & SSRF)**: Discovered missing organization authorization guards in financial endpoints allowing cross-tenant data access (e.g. `GET /cfo-engine/live-state/:orgId`, `GET /financial-metrics/:orgId/*`, `POST /bank-accounts/:id/sync`, DTO `organizationId` injection in `InvoicesController`), and complete lack of SSRF guards (protocol, IP/hostname, redirect, timeout, size limit) in `TallyClient` and `TallyConnectorService`.
4. **Workstream 6 (Rule-Based Financial Determinism)**: Discovered non-deterministic IEEE 754 floating-point calculations, non-deterministic `lastUpdatedAt` timestamps in snapshot hashing, and race conditions between asynchronous event workers (`ClassificationWorker` vs `ReconciliationWorker`).
5. **Workstream 7 (Financial Data Integrity)**: Discovered non-deterministic transaction ID generation (`Date.now()`), lack of voucher sync transaction deduplication prior to event emission, incomplete audit lineage tracking, and unhandled partial sync batch failures.

---

## 1. Observation

### 1.1 Critical Rule 12 Audit (Mock Financial Data in Production)
- **Observation 1.1.1** (`apps/backend/src/integrations/tally/tally-connector.service.ts:58-63`):
  ```typescript
  58: // Mock/Sample Tally Vouchers for Phase 1 Connector validation
  59: const rawVouchers = [
  60:   { MASTERID: 'VCH-TL-101', VOUCHERTYPENAME: 'Payment', AMOUNT: 45000, DATE: '20260727', PARTYLEDGERNAME: 'AWS Hosting', NARRATION: 'Tally Auto Payment AWS' },
  61:   { MASTERID: 'VCH-TL-102', VOUCHERTYPENAME: 'Receipt', AMOUNT: 120000, DATE: '20260726', PARTYLEDGERNAME: 'Customer Invoice Receipt', NARRATION: 'Client Payment Received' },
  62: ];
  ```
  `syncTallyVouchers()` in `TallyConnectorService` emits these mock financial vouchers directly into `transaction.ingested` in production logic instead of querying the actual Tally client API.

- **Observation 1.1.2** (`apps/backend/src/bank-accounts/bank-sync/bank-sync.service.ts:9, 25`):
  ```typescript
  9:  private readonly iciciProvider = new MockICICIProvider();
  ...
  25: const provider = this.iciciProvider;
  ```
  `BankSyncService.syncAccount()` instantiates and executes `MockICICIProvider` (`apps/backend/src/integrations/banking/mock-icici.provider.ts:11-36`) in the production bank synchronization pipeline.

- **Observation 1.1.3** (`apps/backend/src/integrations/quickbooks.service.ts:123-131`):
  ```typescript
  123: const qbInvoices = [
  124:     { Id: 'qb_101', TxnDate: new Date().toISOString().split('T')[0], TotalAmt: 120000, CustomerRef: { name: 'Globex Corp' }, status: 'Paid' },
  ...
  128: const qbPurchases = [
  129:     { Id: 'qb_exp_201', TxnDate: new Date().toISOString().split('T')[0], TotalAmt: 18000, AccountRef: { name: 'Advertising' }, Line: [{ Description: 'Google Ads' }] },
  ```
  `QuickbooksService.syncAccount()` ingests hardcoded mock invoice and purchase transactions directly into the production database.

---

### 1.2 Workstream 1 Audit (Reliability, Null Safety, & Concurrency)
- **Observation 1.2.1** (`apps/backend/src/cfo-engine/live-state.engine.ts:52-54, 37-46`):
  ```typescript
  52: if (this.liveStateMap.has(organizationId)) {
  53:   return this.liveStateMap.get(organizationId)!;
  54: }
  ```
  Line 53 uses a non-null assertion `!`. If map eviction occurs between line 52 and 53, or if `this.liveStateMap` is accessed concurrently during garbage collection, this throws a runtime `TypeError: Cannot read properties of undefined`.
  Furthermore, `registerOnEvents()` (lines 37-46) binds explicit `.on()` listeners while class methods also have `@OnEvent` decorators. This creates duplicate event listener registrations on NestJS module initialization.

- **Observation 1.2.2** (`apps/backend/src/sse/sse.service.ts:8, 34-40`):
  ```typescript
  8:  private subjects = new Map<string, Subject<MessageEvent>>();
  ...
  34: subscribe(organizationId: string): Observable<MessageEvent> {
  35:   if (!this.subjects.has(organizationId)) {
  36:     this.subjects.set(organizationId, new Subject<MessageEvent>());
  ```
  When SSE clients disconnect or reconnect, the RxJS `Subject` for an `organizationId` is retained in `this.subjects` forever. Disconnected subscribers accumulate without completion or unsubscription cleanup, leaking memory continuously.

- **Observation 1.2.3** (`apps/backend/src/cfo-engine/decision-engine.service.ts:52-55, 75-76, 616-620`):
  In `generateDecisions()` and `evaluateStatefulDecisions()`:
  - Line 76: `const requiredCut = state.summary.netBurn - (state.summary.cashInBank / targetRunwayMonths);`
  - When an organization has zero transactions or zero cash/burn (`cashInBank = 0`, `netBurn = 0`), `runwayMonths` becomes `NaN` or `Infinity`, leading to unhandled errors during string formatting (`runway.toFixed(1)` at line 89 throws or outputs `NaN`).

---

### 1.3 Workstream 2 Audit (Security, Tenant Isolation & SSRF Protection)
- **Observation 1.3.1 (Cross-Tenant Authorization Leaks)**:
  - `apps/backend/src/cfo-engine/cfo-engine.controller.ts:56-59`:
    ```typescript
    @Get('live-state/:orgId')
    async getLiveStateSnapshot(@Param('orgId') orgId: string) {
        return this.liveStateEngine.getLiveState(orgId);
    }
    ```
    The endpoint takes `:orgId` directly from the URL parameter instead of deriving it from authenticated JWT context (`req.user.organizationId`). Any authenticated user can view the live financial state snapshot of any organization.
  - `apps/backend/src/financial-metrics/financial-metrics.controller.ts:14, 22, 28`:
    Endpoints `@Get(':orgId/latest')`, `@Get(':orgId/dashboard')`, and `@Get(':orgId/history')` accept `:orgId` from URL route parameters and execute database queries without validating against `req.user.organizationId`.
  - `apps/backend/src/bank-accounts/bank-accounts.controller.ts:47`:
    ```typescript
    @Get()
    findAll(@Query('organizationId') organizationId: string) {
        return this.bankAccountsService.findAll(organizationId);
    }
    ```
    `findAll` allows querying any organization's bank accounts via query param.
  - `apps/backend/src/invoices/invoices.controller.ts:32-36`:
    ```typescript
    @Post()
    create(@Body() createInvoiceDto: CreateInvoiceDto) {
        const { organizationId, ...rest } = createInvoiceDto;
    ```
    Invoice creation accepts `organizationId` from the client request body DTO instead of overriding it with `req.user.organizationId`.

- **Observation 1.3.2 (SSRF Vulnerability in Tally Integration)**:
  - `apps/backend/src/integrations/tally/tally-client.ts:11-23`:
    ```typescript
    public async sendTallyXmlRequest(config: TallyConfig, xmlBody: string): Promise<string> {
      const host = config.tallyHostUrl || 'http://localhost:9000';
      const response = await fetch(host, { ... });
    ```
    `sendTallyXmlRequest()` performs an arbitrary HTTP POST request to user-supplied `tallyHostUrl`.
  - **Deficiencies**:
    1. **Protocol Check**: No validation enforcing `http:` or `https:`. Allows `file:`, `gopher:`, `ftp:`.
    2. **Host/IP Guard**: No DNS resolution check or internal IP filtering (e.g. `127.0.0.1`, `169.254.169.254`, `10.0.0.0/8`, `192.168.0.0/16`).
    3. **Redirect Prevention**: Native `fetch` follows HTTP 301/302 redirects automatically, bypassing surface URL checks.
    4. **Request Timeout**: No `AbortController` timeout configured. A hanging Tally host will block socket connections indefinitely.
    5. **Payload Size Limit**: `await response.text()` buffers unlimited payload size into memory without content-length capping.
    6. **Audit Logging**: Connection attempts and validation failures are not logged to `AuditLog`.

---

### 1.4 Workstream 6 Audit (Rule-Based Financial Determinism)
- **Observation 1.4.1 (Floating-Point Arithmetic Inconsistency)**:
  - `apps/backend/src/events/workers/reconciliation.worker.ts:86-88, 114-118`:
    ```typescript
    if (tx.type === 'EXPENSE' || (tx.type as any) === 'DEBIT') debit += amount;
    ...
    const cashInBank = bankAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
    const netBurn = Math.max(0, debit - credit);
    const runwayMonths = netBurn > 0 ? cashInBank / netBurn : 999;
    ```
    Summing financial floating-point numbers directly in JS causes binary floating-point round-off errors (e.g. `100.1 + 200.2 = 300.30000000000003`), producing non-deterministic metrics across different execution timings.

- **Observation 1.4.2 (Race Conditions Between Workers)**:
  - `ClassificationWorker` (`apps/backend/src/events/workers/classification.worker.ts:86-105`) updates `orgFinancialState` atomically using `{ increment: amount }`.
  - Concurrently, `ReconciliationWorker` (`apps/backend/src/events/workers/reconciliation.worker.ts:127-160`) upserts `orgFinancialState` with absolute values `debitSum30d: debit`.
  - If a batch sync occurs, `ClassificationWorker` incremental updates and `ReconciliationWorker` full-state upserts overwrite each other non-deterministically.

- **Observation 1.4.3 (Non-Deterministic State Hash)**:
  - `LiveStateEngineService` (`apps/backend/src/cfo-engine/live-state.engine.ts:212`) updates `lastUpdatedAt = Date.now()` on every reduction regardless of whether snapshot content changed, causing state hash instability across identical underlying financial data.

---

### 1.5 Workstream 7 Audit (Financial Data Integrity - P0)
- **Observation 1.5.1 (Non-Deterministic Transaction Identifiers)**:
  - `apps/backend/src/integrations/tally/tally-transformer.service.ts:22`:
    ```typescript
    const voucherId = rawVoucher.MASTERID || rawVoucher.VOUCHERKEY || `TALLY-VCH-${Date.now()}`;
    ```
    If `MASTERID` is missing, transaction ID relies on `Date.now()`, creating mutable and non-reproducible transaction IDs for identical source records.

- **Observation 1.5.2 (Lack of Ingestion Deduplication Guard prior to Event Emission)**:
  - `apps/backend/src/integrations/tally/tally-connector.service.ts:71-82`:
    `syncTallyVouchers()` emits `transaction.ingested` for every voucher in the loop without querying `processedTransaction` or database unique constraint before triggering worker execution.

- **Observation 1.5.3 (Partial Sync Failure Recovery)**:
  - In `TallyConnectorService.syncTallyVouchers()` and `QuickbooksService.syncAccount()`, if an error occurs mid-batch during event emission or database creation, previously emitted transactions remain in state without transactional rollback or failure status recording.

---

## 2. Logic Chain

1. **Rule 12 Violations**:
   - *Observation*: Hardcoded arrays of mock transactions exist inside production service files (`tally-connector.service.ts`, `bank-sync.service.ts`, `quickbooks.service.ts`).
   - *Reasoning*: Operating Rule 12 strictly forbids mock data in production code paths. When users invoke Tally sync or ICICI bank sync, these functions inject fabricated numbers (`AWS Hosting ₹45,000`, `ICICI GST ₹45,000`) into the production database and SSE stream.
   - *Conclusion*: Mock data structures must be purged from production services and replaced with real integration connectors or clean empty-result handling.

2. **Tenant Isolation Vulnerability**:
   - *Observation*: `CfoEngineController.getLiveStateSnapshot(@Param('orgId'))`, `FinancialMetricsController`, `BankAccountsController.findAll(@Query('organizationId'))`, and `InvoicesController.create(@Body())` take `organizationId` from client-controlled params/queries/bodies.
   - *Reasoning*: An authenticated user belonging to `Org-A` can pass `orgId = "Org-B"` in the URL path or body. Because the controller passes this `orgId` parameter directly to Prisma queries without verifying `req.user.organizationId`, `Org-A` can read/write `Org-B`'s financial records.
   - *Conclusion*: Every financial controller endpoint must strictly validate and enforce `organizationId = req.user.organizationId`.

3. **SSRF Vulnerability**:
   - *Observation*: `TallyClient.sendTallyXmlRequest` executes `fetch(config.tallyHostUrl)` without host/IP filtering or timeout control.
   - *Reasoning*: A malicious or compromised tenant user could set `tallyHostUrl = "http://169.254.169.254/latest/meta-data/"` or `"http://127.0.0.1:6379"`. The backend node process will execute an uninhibited HTTP request to internal cloud metadata or intranet services, exposing cloud credentials or internal infrastructure.
   - *Conclusion*: A robust SSRF guard utility must be implemented in `TallyClient` enforcing HTTP/HTTPS schemes, resolving DNS to verify target IP is not in private/loopback/link-local CIDR ranges, disabling HTTP redirects, enforcing a 5-second timeout via `AbortController`, capping response body size to 5MB, and logging all connection tests to audit logs.

4. **SSE & State Engine Memory Leaks**:
   - *Observation*: `SseService` retains RxJS `Subject` instances indefinitely in `this.subjects = new Map()`. `LiveStateEngineService` retains `liveStateMap = new Map()`.
   - *Reasoning*: As client connections disconnect and reconnect over time, subject references and snapshots accumulate in process RAM without eviction or cleanup on NestJS module destroy.
   - *Conclusion*: Implement map pruning on client disconnect, explicit stream closing (`subject.complete()`), LRU size bounds, and `OnModuleDestroy` cleanup handlers.

5. **Financial Determinism & Floating-Point Precision**:
   - *Observation*: Currency balances and burn rates are calculated using standard JS numbers (`+`, `-`, `/`) across workers and services.
   - *Reasoning*: Standard JS double precision floats produce rounding errors (e.g. `0.1 + 0.2 != 0.3`). Across repeated recalculations and retries, these minor discrepancies alter financial metrics and cause false-positive decision alerts.
   - *Conclusion*: All monetary calculations must use rounded integer cent values or fixed decimal precision helpers (`Math.round(val * 100) / 100` or `Decimal.js` equivalent).

---

## 3. Caveats

- **External Tally Server Availability**: Live Tally XML integration testing requires an active local TallyPrime instance listening on HTTP port 9000. In environments without a live Tally instance, `testConnection` correctly returns connection refusal errors without crashing.
- **Data Migration**: Existing transactions in production database schema that were generated with legacy non-deterministic IDs may require backfilling if strict immutability checks are enabled retroactively.

---

## 4. Conclusion

The FounderCFO V19 backend in `apps/backend/src/` currently contains high-severity security vulnerabilities (SSRF, cross-tenant isolation bypasses), critical compliance violations (hardcoded mock data in production services), reliability risks (memory leaks, null assertions), and financial calculation non-determinism.

To achieve production readiness, the system requires targeted fixes across 10 core files as detailed in Section 5.

---

## 5. Summary of Files to Modify & Proposed Targeted Fixes

| Workstream | File Path | Line Range | Issue Description | Proposed Targeted Fix | Risk / Rollback / Impact |
|---|---|---|---|---|---|
| **Rule 12** | `apps/backend/src/integrations/tally/tally-connector.service.ts` | 58–63 | Hardcoded mock vouchers in production `syncTallyVouchers()` | Remove mock array. Fetch XML from `TallyClient` & parse vouchers. | **Risk**: Low. **Rollback**: Revert file. **Impact**: Prevents fake transactions in production. |
| **Rule 12** | `apps/backend/src/bank-accounts/bank-sync/bank-sync.service.ts` | 9, 25 | Production code uses `MockICICIProvider` | Replace mock provider with production banking interface guard. | **Risk**: Low. **Rollback**: Revert file. **Impact**: Purges mock bank sync. |
| **Rule 12** | `apps/backend/src/integrations/quickbooks.service.ts` | 123–131 | Hardcoded mock QBO invoices/expenses in sync | Replace mock array with real Intuit API call or empty sync response when unconfigured. | **Risk**: Low. **Rollback**: Revert file. **Impact**: Purges mock QBO data. |
| **WS1** | `apps/backend/src/cfo-engine/live-state.engine.ts` | 37–46, 53 | Null dereference `!`, duplicate event bindings, unbounded map memory leak | Safe map lookup (`this.liveStateMap.get(orgId) || null`), remove duplicate `.on()` listeners, add LRU cache cap & `OnModuleDestroy`. | **Risk**: Low. **Rollback**: Revert file. **Impact**: Eliminates state engine crashes & memory leaks. |
| **WS1** | `apps/backend/src/sse/sse.service.ts` | 8, 34–40 | Unbounded `subjects` Map memory leak | Prune empty subjects on subscriber count 0, complete subjects on `OnModuleDestroy`. | **Risk**: Low. **Rollback**: Revert file. **Impact**: Reclaims SSE connection memory. |
| **WS1** | `apps/backend/src/cfo-engine/decision-engine.service.ts` | 76, 89 | `NaN`/`Infinity` division by zero on zero-transaction orgs | Add guard: `const safeBurn = Math.max(netBurn, 1);` and validate zero-cash edge cases. | **Risk**: Low. **Rollback**: Revert file. **Impact**: Zero crashes on cold-start orgs. |
| **WS2** | `apps/backend/src/cfo-engine/cfo-engine.controller.ts` | 56–59 | Tenant bypass in `GET live-state/:orgId` | Enforce `req.user.organizationId` check; reject mismatched `orgId` with `ForbiddenException`. | **Risk**: Low. **Rollback**: Revert file. **Impact**: Prevents cross-tenant state access. |
| **WS2** | `apps/backend/src/financial-metrics/financial-metrics.controller.ts` | 14, 22, 28 | Tenant bypass in `:orgId` endpoints | Replace route `:orgId` param with `@GetUser('organizationId')` or validate matching org ID. | **Risk**: Low. **Rollback**: Revert file. **Impact**: Enforces strict financial metrics isolation. |
| **WS2** | `apps/backend/src/bank-accounts/bank-accounts.controller.ts` | 30, 47 | Tenant bypass in bank account query/sync | Enforce `organizationId` from `req.user.organizationId` in `findAll` and verify account ownership on `sync`. | **Risk**: Low. **Rollback**: Revert file. **Impact**: Secures bank account endpoints. |
| **WS2** | `apps/backend/src/invoices/invoices.controller.ts` | 32–36 | Client DTO injects `organizationId` | Override `createInvoiceDto.organizationId = req.user.organizationId`. | **Risk**: Low. **Rollback**: Revert file. **Impact**: Prevents invoice cross-tenant injection. |
| **WS2** | `apps/backend/src/integrations/tally/tally-client.ts` | 11–23 | Missing SSRF guards on Tally HTTP client | Implement `validateTallyHostUrl()`: enforce HTTP/HTTPS, resolve DNS & reject internal/loopback IPs, disable redirects, add 5s timeout, cap response size to 5MB, log audit entries. | **Risk**: Medium. **Rollback**: Revert file. **Impact**: Blocks SSRF attacks against internal network. |
| **WS6** | `apps/backend/src/events/workers/reconciliation.worker.ts` | 86–118 | Floating point precision errors & worker race condition | Implement `roundToTwoDecimals()` for all monetary sums; add serializable isolation lock. | **Risk**: Low. **Rollback**: Revert file. **Impact**: Guarantees deterministic financial metrics. |
| **WS7** | `apps/backend/src/integrations/tally/tally-transformer.service.ts` | 22 | Non-deterministic fallback transaction ID `Date.now()` | Generate stable SHA-256 hash derived from `organizationId + rawVoucher.VOUCHERNUMBER + amount + date`. | **Risk**: Low. **Rollback**: Revert file. **Impact**: Ensures transaction ID immutability & stability. |

---

## 6. Verification Methods

### 6.1 Independent Code Inspection
1. **Rule 12 Verification**: Inspect `tally-connector.service.ts`, `bank-sync.service.ts`, and `quickbooks.service.ts` to confirm 0 hardcoded transaction arrays exist in production code paths.
2. **WS2 Verification**: Check all controller routes under `apps/backend/src/` to verify no route allows arbitrary `:orgId` input without comparing against `req.user.organizationId`.
3. **SSRF Verification**: Inspect `tally-client.ts` to verify `validateTallyHostUrl()` validates protocol, IP CIDR ranges, timeout, and response body size.

### 6.2 Unit & Integration Test Suite Verification
Run the backend test suite via terminal command:
```powershell
npm --prefix apps/backend test
```
- **Idempotency & Deduplication Test**: Execute repeated POST requests to Tally sync and verify `processedTransaction` count and transaction count remain unchanged.
- **SSRF Hardening Test**: Trigger `POST /api/integrations/tally/test-connection` with payload `{"tallyHostUrl": "http://169.254.169.254/latest/meta-data/"}` and verify server returns HTTP 400/403 with `Forbidden target host/IP`.
- **Tenant Isolation Test**: Issue JWT for `Org-A` and request `GET /api/cfo-engine/live-state/Org-B` and verify HTTP 403 Forbidden is returned.
- **Zero-Transaction Org Test**: Call `getLiveState` and `generateDecisions` for a freshly created organization with 0 transactions and verify 0 server exceptions occur.
