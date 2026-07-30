## 2026-07-27T13:13:18Z
You are the Security, Tenant Isolation & SSRF Worker for FounderCFO V19.
Your working directory is s:\CFO\CFO\.agents\worker_m4.
Please create your working directory s:\CFO\CFO\.agents\worker_m4 if it doesn't exist, and create your BRIEFING.md and progress.md.

Read s:\CFO\CFO\.agents\ORIGINAL_REQUEST.md, s:\CFO\CFO\PROJECT.md, and s:\CFO\CFO\.agents\orchestrator\plan.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your objective is to execute Milestone M4 (Security, Tenant Isolation & Production-Grade SSRF Protection):
1. `apps/backend/src/cfo-engine/cfo-engine.controller.ts`:
   - Enforce tenant isolation on `@Get('live-state/:orgId')`. Compare route `:orgId` with `req.user.organizationId`. Throw `ForbiddenException('Cross-tenant access forbidden')` if mismatched.
2. `apps/backend/src/financial-metrics/financial-metrics.controller.ts`:
   - Enforce tenant isolation on all `:orgId` routes (`:orgId/latest`, `:orgId/dashboard`, `:orgId/history`). Verify route `:orgId` matches `req.user.organizationId` or use `req.user.organizationId` directly. Return 403 Forbidden on cross-tenant attempts.
3. `apps/backend/src/bank-accounts/bank-accounts.controller.ts`:
   - Override/validate `organizationId` in `findAll()` with `req.user.organizationId`.
   - Verify account ownership against `req.user.organizationId` on bank sync endpoints (`POST :id/sync`).
4. `apps/backend/src/invoices/invoices.controller.ts`:
   - In `create()`, override `createInvoiceDto.organizationId = req.user.organizationId` derived strictly from authenticated JWT context.
5. `apps/backend/src/integrations/tally/tally-client.ts`:
   - Implement production-grade SSRF protection (`validateTallyHostUrl`):
     - Protocol validation: Allow ONLY `http:` and `https:`.
     - IP/Hostname validation: Reject private (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`), and link-local (`169.254.0.0/16`) targets unless host is explicitly listed in `process.env.TALLY_ALLOWED_INTERNAL_HOSTS`.
     - Disable HTTP redirects (`redirect: 'error'`).
     - Enforce 5s timeout (`AbortSignal.timeout(5000)`).
     - Response payload size limit: Capped at 5MB max.
     - Security audit logging: Log Tally connection tests and SSRF block events to `AuditLog`.
6. `apps/backend/src/auth/jwt.strategy.ts`:
   - Update `JwtStrategy` extractor to include `ExtractJwt.fromUrlQueryParameter('token')` alongside `ExtractJwt.fromAuthHeaderAsBearerToken()` to support authenticated browser SSE streams.

After implementation:
- Run backend compilation (`npm --prefix apps/backend run build`).
- Run backend unit and E2E test suites (`npm --prefix apps/backend test` and `npm --prefix apps/backend run test:e2e`).
- Write your handoff report to `s:\CFO\CFO\.agents\worker_m4\handoff.md`.
- Report back via send_message when complete.
