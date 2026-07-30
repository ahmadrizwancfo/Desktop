## 2026-07-27T19:01:38Z
You are worker_m4_fix, a Worker subagent assigned to remediate Milestone M4 (Security & Tenant Isolation) gaps identified in code review.
Your working directory is `s:\CFO\CFO\.agents\worker_m4_fix`.

TASK:
1. Initialize `BRIEFING.md` and `progress.md` in `s:\CFO\CFO\.agents\worker_m4_fix`.
2. Read system context: `s:\CFO\CFO\PROJECT.md`, `s:\CFO\CFO\.agents\orchestrator\plan.md`, `s:\CFO\CFO\.agents\reviewer_m4\handoff.md`.

3. Remediate the 3 security and test findings identified by Reviewer M4:

   Finding 1 — Single-Resource Bank Account Route Tenant Checks:
   - File: `apps/backend/src/bank-accounts/bank-accounts.controller.ts`
   - Update `@Get(':id')`, `@Patch(':id')`, `@Delete(':id')`:
     - Inject `@GetUser() user: any`.
     - Fetch bank account by ID. If not found, throw `NotFoundException('Bank account not found')`.
     - Verify `account.organizationId === user.organizationId`. If mismatch, throw `ForbiddenException('Cross-tenant access forbidden')`.

   Finding 2 — Single-Resource Invoice Route Tenant Checks:
   - File: `apps/backend/src/invoices/invoices.controller.ts`
   - Update `@Get(':id')`, `@Patch(':id')`, `@Delete(':id')`:
     - Inject `@GetUser() user: any`.
     - Fetch invoice by ID. If not found, throw `NotFoundException('Invoice not found')`.
     - Verify `invoice.organizationId === user.organizationId`. If mismatch, throw `ForbiddenException('Cross-tenant access forbidden')`.

   Finding 3 — E2E Test Parameter & Stream Timeout Fixes:
   - File: `apps/backend/test/m4-challenger-stress.e2e-spec.ts`
   - Test 2.7: Change `status: 'PENDING'` to valid `InvoiceStatus` enum `'DRAFT'`.
   - Test 4.1: Ensure the SSE HTTP response stream is properly destroyed/closed in the test callback/cleanup so Jest test finishes cleanly under 5000ms.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work.

4. Run build and tests:
   - `npm --prefix apps/backend run build`
   - `npm --prefix apps/backend test`
   - `npm --prefix apps/backend run test:e2e` (MUST pass exit code 0 across all test suites, including `m4-challenger-stress.e2e-spec.ts`)

5. Write handoff report `s:\CFO\CFO\.agents\worker_m4_fix\handoff.md`.
6. Send completion message to parent (`91981a35-33bd-40dd-b7d4-1750ec7ffefe`) with your handoff location and test results.
