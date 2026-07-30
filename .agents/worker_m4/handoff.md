# Handoff Report — worker_m4 (Milestone M4: Security, Tenant Isolation & Production-Grade SSRF Protection)

## 1. Observation
We implemented Milestone M4 security and SSRF protection requirements across 6 core backend source files and 1 unit test suite:

- **CFO Engine Controller** (`apps/backend/src/cfo-engine/cfo-engine.controller.ts`):
  - Updated `@Get('live-state/:orgId')` to verify `req.user.organizationId` matches `orgId`. Returns `403 Forbidden` (`ForbiddenException`) on mismatch or missing organization ID.

- **Financial Metrics Controller** (`apps/backend/src/financial-metrics/financial-metrics.controller.ts`):
  - Updated routes `:orgId/latest`, `:orgId/dashboard`, and `:orgId/history` to extract `@GetUser('organizationId')` and verify match against `:orgId`. Throws `403 Forbidden` (`ForbiddenException`) on mismatch.

- **Bank Accounts Controller** (`apps/backend/src/bank-accounts/bank-accounts.controller.ts`):
  - Enforced `organizationId` from `@GetUser('organizationId')` in `findAll()`, rejecting cross-tenant query overrides with `403 Forbidden`.
  - Added bank account ownership verification on `@Post(':id/sync')`. Lookups check `account.organizationId === user.organizationId`, throwing `403 Forbidden` on mismatch or `404 Not Found` if missing.
  - Enforced `organizationId` from authenticated user on `@Post()` bank account creation.

- **Invoices Controller** (`apps/backend/src/invoices/invoices.controller.ts`):
  - Overrode `createInvoiceDto.organizationId` with authenticated `req.user.organizationId` in `@Post() create()`, preventing cross-tenant invoice injection.

- **Tally Client & Integration** (`apps/backend/src/integrations/tally/tally-client.ts`):
  - Implemented SSRF guard `validateTallyHostUrl`:
    - Protocol validation: Allows only `http:` and `https:` schemes.
    - IP / Hostname validation: Rejects loopback (`127.0.0.1`, `localhost`, `::1`, `0.0.0.0`), private IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and cloud metadata IPs (`169.254.169.254` / `169.254.0.0/16`). Re-evaluates DNS resolutions for domain targets. Allows configured hosts via `TALLY_ALLOWED_INTERNAL_HOSTS` override.
    - Redirect prevention: Sets `redirect: 'error'` in HTTP requests.
    - Request timeout: Enforces strict 5-second timeout using `AbortSignal.timeout(5000)`.
    - Response payload limit: Caps payload sizes to 5MB (`5 * 1024 * 1024` bytes).
    - Security Audit Logging: Writes security events (`SSRF_BLOCKED`, `TALLY_CONNECTION_TEST`, `PAYLOAD_LIMIT_EXCEEDED`, `TIMEOUT`) to `prisma.auditLog`.

- **JWT Strategy** (`apps/backend/src/auth/jwt.strategy.ts`):
  - Updated `JwtStrategy` `jwtFromRequest` using `ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), ExtractJwt.fromUrlQueryParameter('token')])` to support browser SSE `EventSource` authentication.

- **Tally Client Unit Test Suite** (`apps/backend/src/integrations/tally/tally-client.spec.ts`):
  - Created unit test suite verifying SSRF validation rules across valid public URLs, forbidden protocols, loopback IPs, private IP ranges, cloud metadata IPs, and exception throwing.

## 2. Logic Chain
1. **Tenant Isolation**: In multi-tenant systems, route parameters like `:orgId` or DTO fields like `organizationId` must never be trusted without comparing against the authenticated JWT principal (`req.user.organizationId`). Enforcing match checks and throwing `403 Forbidden` prevents unauthorized cross-tenant data access and invoice creation.
2. **SSRF Guardrails**: Unchecked outbound HTTP requests from backend integrations allow attackers to scan internal networks, access cloud metadata servers (`169.254.169.254`), or trigger internal service endpoints. Strict protocol checks, loopback/private IP rejection, disabling HTTP redirects, setting a 5-second request timeout, and enforcing 5MB payload caps prevent SSRF attacks and resource exhaustion.
3. **SSE Connection Authentication**: Browser `EventSource` APIs do not support setting custom `Authorization` HTTP headers. Supporting JWT extraction from query parameter `?token=` alongside Bearer headers allows browser clients to authenticate real-time SSE streams securely.

## 3. Caveats
- Outbound Tally integration requests to internal hosts in test environments require setting `TALLY_ALLOWED_INTERNAL_HOSTS` or using valid public endpoints.
- DB security audit logs require at least one user record in the database; `logSecurityAudit` falls back to querying the first user ID if `userId` is omitted.

## 4. Conclusion
Milestone M4 requirements are 100% satisfied:
- Cross-tenant access on `cfo-engine`, `financial-metrics`, `bank-accounts`, and `invoices` endpoints is strictly rejected with `403 Forbidden`.
- Production-grade SSRF protection in `tally-client.ts` enforces HTTP/HTTPS, rejects loopback/private/cloud metadata targets, disables redirects, caps timeouts to 5s, limits responses to 5MB, and writes security audit logs.
- JWT strategy supports query param `?token=` for SSE browser streams.
- All code changes pass NestJS build cleanly (0 errors).
- Unit tests: 14/14 test suites passed (50/50 specs).
- E2E tests: 6/6 test suites passed (104/104 specs, including all 93 milestone specs).

## 5. Verification Method
1. Build verification:
   `npm --prefix apps/backend run build` -> Exit code 0, 0 TS compilation errors.
2. Unit test verification:
   `npm --prefix apps/backend test` -> 14 passed, 14 total (50/50 specs passed).
3. E2E test suite verification:
   `npm --prefix apps/backend run test:e2e` -> 6 passed, 6 total (104/104 specs passed).
4. Code inspection:
   - Check `cfo-engine.controller.ts` line 57 for `req.user.organizationId !== orgId` check.
   - Check `financial-metrics.controller.ts` lines 14, 22, 28 for `@GetUser('organizationId')` check.
   - Check `bank-accounts.controller.ts` line 29 for ownership check on `:id/sync` and `findAll`.
   - Check `invoices.controller.ts` line 33 for `createInvoiceDto.organizationId` override.
   - Check `tally-client.ts` for `validateTallyHostUrl`, `redirect: 'error'`, `AbortSignal.timeout(5000)`, 5MB limit, and `logSecurityAudit`.
   - Check `jwt.strategy.ts` line 18 for `ExtractJwt.fromUrlQueryParameter('token')`.
