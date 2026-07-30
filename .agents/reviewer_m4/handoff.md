# Review & Handoff Report — reviewer_m4 (Milestone M4: Security, Tenant Isolation & Production-Grade SSRF Protection)

**Verdict**: REQUEST_CHANGES

---

## 1. Observation

### Command Execution Results
1. **NestJS Backend Build**:
   - Command: `npm --prefix apps/backend run build`
   - Result: Exit code 0 (Success). 0 TypeScript compilation errors.

2. **Unit Test Suite**:
   - Command: `npm --prefix apps/backend test`
   - Result: 14 test suites passed, 14 total. 50 tests passed, 50 total.
   - Includes `tally-client.spec.ts` testing HTTP/HTTPS protocol validation, loopback IP rejection, private IPv4 CIDR blocks, cloud metadata IP rejection, and `sendTallyXmlRequest` exception throwing.

3. **E2E Test Suite**:
   - Command: `npm --prefix apps/backend run test:e2e`
   - Result: FAILED with exit code 1 (6 suites passed, 1 suite failed: `test/m4-challenger-stress.e2e-spec.ts`).
   - Verbatim Jest failure output:
     ```
     FAIL test/m4-challenger-stress.e2e-spec.ts (12.921 s)
       ● Milestone M4 Challenger Security & SSRF Empirical Stress Test Suite › 2. Cross-Tenant Authorization Checks › 2.7: Creating invoice with foreign organizationId overrides to authenticated orgId
         expect(received).toBe(expected) // Object.is equality
         Expected: 201
         Received: 400
           137 |       expect(res.status).toBe(201);

       ● Milestone M4 Challenger Security & SSRF Empirical Stress Test Suite › 4. SSE Authentication Query Parameter Token Extraction › 4.1: Successfully authenticates SSE connection using ?token=<jwt_token> query param
         thrown: "Exceeded timeout of 5000 ms for a test."
     ```

---

### Code Review Observations (Verbatim Inspections)

1. **CFO Engine Controller** (`apps/backend/src/cfo-engine/cfo-engine.controller.ts`):
   - Lines 57–63 (`@Get('live-state/:orgId')`):
     ```typescript
     if (!req.user?.organizationId || req.user.organizationId !== orgId) {
         throw new ForbiddenException('Cross-tenant access forbidden');
     }
     ```
   - Verified: Derived strictly from `req.user.organizationId`, returns 403 Forbidden on mismatch.

2. **Financial Metrics Controller** (`apps/backend/src/financial-metrics/financial-metrics.controller.ts`):
   - Lines 15–54 (`:orgId/latest`, `:orgId/dashboard`, `:orgId/history`):
     ```typescript
     if (!userOrgId || userOrgId !== organizationId) {
         throw new ForbiddenException('Cross-tenant access forbidden');
     }
     ```
   - Verified: All 3 endpoints extract `@GetUser('organizationId')` and return 403 Forbidden on mismatch.

3. **Bank Accounts Controller** (`apps/backend/src/bank-accounts/bank-accounts.controller.ts`):
   - Lines 33–46 (`@Post(':id/sync')`): Verifies `account.organizationId === user.organizationId`, throws 403 Forbidden on mismatch.
   - Lines 49–61 (`@Post()`): Overrides payload with authenticated `organizationId = user.organizationId`.
   - Lines 63–72 (`@Get()`): Enforces `queryOrgId === user.organizationId` and calls `findAll(user.organizationId)`.
   - **Observation (Security Gap)**: Lines 74–92 (`@Get(':id')`, `@Patch(':id')`, `@Delete(':id')`):
     ```typescript
     @Get(':id')
     findOne(@Param('id') id: string) {
         return this.bankAccountsService.findOne(id);
     }
     ```
     `findOne`, `update`, and `remove` take `:id` parameter but do NOT verify if the bank account belongs to `user.organizationId`.

4. **Invoices Controller** (`apps/backend/src/invoices/invoices.controller.ts`):
   - Lines 31–45 (`@Post()`): Overrides `createInvoiceDto.organizationId = user.organizationId`.
   - Lines 47–60 (`findAll`, `getReminders`, `getAging`): Uses `user.organizationId`.
   - **Observation (Security Gap)**: Lines 71–86 (`@Get(':id')`, `@Patch(':id')`, `@Delete(':id')`):
     ```typescript
     @Get(':id')
     findOne(@Param('id') id: string) {
         return this.invoicesService.findOne(id);
     }
     ```
     `findOne`, `update`, and `remove` take `:id` parameter but do NOT check if the target invoice belongs to `user.organizationId`.

5. **Tally Client** (`apps/backend/src/integrations/tally/tally-client.ts`):
   - Protocol check (lines 30–32): `http:` and `https:` only.
   - Allowlist check (lines 37–42): `process.env.TALLY_ALLOWED_INTERNAL_HOSTS`.
   - Loopback & Private CIDR blocks (lines 46–87): Rejects `localhost`, `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, and `169.254.0.0/16` (including `169.254.169.254`).
   - DNS resolution check (lines 90–104): `dns.promises.lookup` checks underlying IPs.
   - Disabling redirects (line 161): `redirect: 'error'`.
   - Request timeout (line 162): `AbortSignal.timeout(5000)`.
   - Response size cap (lines 171–183): 5MB limit check on Content-Length and body buffer byte length.
   - Audit logging (lines 112–134): Writes audit log entries to `prisma.auditLog`.

6. **JWT Strategy** (`apps/backend/src/auth/jwt.strategy.ts`):
   - Lines 17–20: `ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), ExtractJwt.fromUrlQueryParameter('token')])`.
   - Verified: Extracts JWT from `?token=` query parameter.

---

## 2. Logic Chain

1. **Tenant Isolation Gap**:
   - In a multi-tenant application, single-resource GET, PATCH, and DELETE endpoints (`/api/bank-accounts/:id` and `/api/invoices/:id`) must verify that the target entity belongs to the authenticated user's organization (`req.user.organizationId`).
   - Currently, `bank-accounts.controller.ts` (lines 74–92) and `invoices.controller.ts` (lines 71–86) pass `:id` directly to `findOne`, `update`, and `remove` without checking ownership against `req.user.organizationId`.
   - An authenticated user from Organization A can read, update, or delete bank accounts and invoices belonging to Organization B simply by targeting their UUID `id`.

2. **E2E Test Command Failure**:
   - Running `npm --prefix apps/backend run test:e2e` fails with exit code 1.
   - In `test/m4-challenger-stress.e2e-spec.ts`:
     - Test 2.7 (`T4-TENANT-07`) sends `status: 'PENDING'`, which fails DTO validation because `InvoiceStatus` enum values in Prisma are `DRAFT`, `SENT`, `PAID`, `OVERDUE`, `CANCELLED`.
     - Test 4.1 (`4.1: Successfully authenticates SSE connection using ?token=<jwt_token> query param`) handles SSE streams without destroying the HTTP request, causing Jest to exceed its 5000ms test timeout.

3. **Conclusion Rationale**:
   - Per project guidelines, any unhandled security vulnerability (cross-tenant access on single-resource routes) or test suite execution failure requires a verdict of `REQUEST_CHANGES`.

---

## 3. Caveats

- The core SSRF guard implementation (`tally-client.ts`), JWT strategy query parameter extractor (`jwt.strategy.ts`), and primary controller list/create routes (`cfo-engine`, `financial-metrics`, `bank-accounts` list/create/sync, `invoices` list/create) are completely solid, robust, and correctly implemented.
- Fixing the single-resource route ownership checks and updating the e2e test parameters will bring M4 to 100% compliance.

---

## 4. Conclusion & Findings

**Verdict**: REQUEST_CHANGES

### Finding 1 [Major - Security & Tenant Isolation Gap]: Missing Tenant Ownership Verification on `GET /api/bank-accounts/:id`, `PATCH /api/bank-accounts/:id`, and `DELETE /api/bank-accounts/:id`
- **Location**: `apps/backend/src/bank-accounts/bank-accounts.controller.ts` (lines 74–92)
- **Why this is a problem**: `findOne`, `update`, and `remove` delegate directly to `bankAccountsService` using `:id` without checking if `account.organizationId === user.organizationId`.
- **Suggestion**: Inject `@GetUser() user: any` into `findOne`, `update`, and `remove`. Verify ownership against `user.organizationId` (throwing `ForbiddenException('Cross-tenant access forbidden')` on mismatch or `NotFoundException` if missing).

### Finding 2 [Major - Security & Tenant Isolation Gap]: Missing Tenant Ownership Verification on `GET /api/invoices/:id`, `PATCH /api/invoices/:id`, and `DELETE /api/invoices/:id`
- **Location**: `apps/backend/src/invoices/invoices.controller.ts` (lines 71–86)
- **Why this is a problem**: `findOne`, `update`, and `remove` delegate directly to `invoicesService` using `:id` without checking if the invoice belongs to `user.organizationId`.
- **Suggestion**: Inject `@GetUser() user: any` into `findOne`, `update`, and `remove`. Verify ownership against `user.organizationId` (throwing `ForbiddenException('Cross-tenant access forbidden')` on mismatch).

### Finding 3 [Major - E2E Verification Failure]: `npm --prefix apps/backend run test:e2e` Exit Code 1
- **Location**: `apps/backend/test/m4-challenger-stress.e2e-spec.ts` (lines 137, 212)
- **Why this is a problem**: E2E test suite fails exit code 1. Test 2.7 sends invalid enum `'PENDING'` (returns 400 Bad Request instead of 201), and test 4.1 times out on SSE stream handling.
- **Suggestion**: Fix test 2.7 to use a valid `InvoiceStatus` enum (e.g. `'DRAFT'`) and update test 4.1 to properly destroy the SSE HTTP request stream.

---

## 5. Verification Method

1. **Build Verification**:
   `npm --prefix apps/backend run build` → Exit code 0, 0 TS errors.

2. **Unit Test Verification**:
   `npm --prefix apps/backend test` → 14 passed, 14 total (50/50 specs).

3. **E2E Test Verification (Post-Fix)**:
   `npm --prefix apps/backend run test:e2e` → 7 passed, 7 total (all specs passing, exit code 0).

4. **Code Inspection**:
   - Verify `bank-accounts.controller.ts` lines 74–92 for `account.organizationId !== user.organizationId` check.
   - Verify `invoices.controller.ts` lines 71–86 for `invoice.organizationId !== user.organizationId` check.
