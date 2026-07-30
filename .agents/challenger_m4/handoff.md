# Milestone M4 Security & SSRF Empirical Stress Test Report — Adversarial Challenger

## 1. Observation

We empirically stress-tested the Milestone M4 security, tenant isolation, and SSRF implementation in `apps/backend/` across four critical areas:

### A. Full E2E Test Suite Execution
- Command executed: `npm --prefix apps/backend run test:e2e`
- Output:
  ```text
  PASS test/m3-challenger-stress.e2e-spec.ts
  PASS test/tier3-cross-feature.e2e-spec.ts
  PASS test/app.e2e-spec.ts
  PASS test/tier4-real-world-scenarios.e2e-spec.ts
  PASS test/m4-challenger-stress.e2e-spec.ts
  PASS test/tier1-feature-coverage.e2e-spec.ts
  PASS test/tier2-boundary-corner.e2e-spec.ts

  Test Suites: 7 passed, 7 total
  Tests:       119 passed, 119 total
  Snapshots:   0 total
  Time:        6.842 s
  ```
- Result: 100% of E2E test suites passed (119/119 specs passed, exceeding the 104 baseline requirement).

### B. Cross-Tenant Authorization Checks (`Org-B` data with `Org-A` JWT context)
Empirically tested in `apps/backend/test/m4-challenger-stress.e2e-spec.ts` under Section 2:
1. `GET /api/cfo-engine/live-state/${tenantB_OrgId}` using Org-A token:
   - Status: `403 Forbidden`
   - Response: `{"statusCode": 403, "message": "Cross-tenant access forbidden"}`
2. `GET /api/financial-metrics/${tenantB_OrgId}/latest` using Org-A token:
   - Status: `403 Forbidden`
   - Response: `{"statusCode": 403, "message": "Cross-tenant access forbidden"}`
3. `GET /api/financial-metrics/${tenantB_OrgId}/dashboard` using Org-A token:
   - Status: `403 Forbidden`
   - Response: `{"statusCode": 403, "message": "Cross-tenant access forbidden"}`
4. `GET /api/financial-metrics/${tenantB_OrgId}/history` using Org-A token:
   - Status: `403 Forbidden`
   - Response: `{"statusCode": 403, "message": "Cross-tenant access forbidden"}`
5. `GET /api/bank-accounts?organizationId=${tenantB_OrgId}` using Org-A token:
   - Status: `403 Forbidden`
   - Response: `{"statusCode": 403, "message": "Cross-tenant access forbidden"}`
6. `POST /api/bank-accounts` sending `{ organizationId: tenantB_OrgId }` with Org-A token:
   - Status: `201 Created`
   - Payload `organizationId`: Overridden to `tenantA_OrgId` (`res.body.organizationId === tenantA_OrgId`).
7. `POST /api/invoices` sending `{ organizationId: tenantB_OrgId }` with Org-A token:
   - Status: `201 Created`
   - Payload `organizationId`: Overridden to `tenantA_OrgId` (`res.body.organizationId === tenantA_OrgId`).

### C. SSRF Protection in `tally-client.ts`
Empirically tested in `apps/backend/test/m4-challenger-stress.e2e-spec.ts` under Section 3:
1. `169.254.169.254` (Cloud Metadata IP):
   - `validateTallyHostUrl('http://169.254.169.254/latest/meta-data/')` -> `{ isValid: false, reason: "Forbidden cloud metadata / link-local IP (169.254.0.0/16): 169.254.169.254" }`
   - `sendTallyXmlRequest()` -> Throws `BadRequestException`: `"SSRF Validation Failed: Forbidden cloud metadata / link-local IP (169.254.0.0/16): 169.254.169.254"`
2. `127.0.0.1` and `localhost` (Loopback):
   - `validateTallyHostUrl('http://127.0.0.1:9000')` -> `{ isValid: false, reason: "Forbidden loopback IP (127.0.0.0/8): 127.0.0.1" }`
   - `validateTallyHostUrl('http://localhost:9000')` -> `{ isValid: false, reason: "Forbidden loopback target: localhost" }`
   - `sendTallyXmlRequest()` -> Throws `BadRequestException`.
3. `10.0.0.1` (Private IPv4 Range):
   - `validateTallyHostUrl('http://10.0.0.1:9000')` -> `{ isValid: false, reason: "Forbidden private IP range (10.0.0.0/8): 10.0.0.1" }`
   - `sendTallyXmlRequest()` -> Throws `BadRequestException`.
4. `gopher://` (Forbidden Protocol Scheme):
   - `validateTallyHostUrl('gopher://10.0.0.1:70/1')` -> `{ isValid: false, reason: "Invalid protocol scheme 'gopher:'. Only http: and https: are allowed." }`
   - `sendTallyXmlRequest()` -> Throws `BadRequestException`.
5. `file://` (Forbidden Protocol Scheme):
   - `validateTallyHostUrl('file:///etc/passwd')` -> `{ isValid: false, reason: "Invalid protocol scheme 'file:'. Only http: and https: are allowed." }`
   - `sendTallyXmlRequest()` -> Throws `BadRequestException`.

### D. SSE Authentication Query Parameter Extraction (`?token=`)
Empirically tested in `apps/backend/test/m4-challenger-stress.e2e-spec.ts` under Section 4:
1. `GET /sse/stream?token=${tenantA_Token}` -> Returns `200 OK`, `Content-Type: text/event-stream`.
2. `GET /sse/stream?token=invalid_token` -> Returns `401 Unauthorized`.
3. `GET /sse/stream` (no token header or query param) -> Returns `401 Unauthorized`.

---

## 2. Logic Chain

1. **E2E Suite Integrity**: Running `npm --prefix apps/backend run test:e2e` executes all 7 test suites (including baseline Tiers 1-4, M3 stress, app e2e, and the newly added M4 security stress suite). All 119 specs passed without regressions.
2. **Tenant Isolation**: Cross-tenant data leaks occur when route parameters like `:orgId` or DTO fields like `organizationId` are trusted blindly without comparing against the JWT identity. The backend controller guards explicitly compare `req.user.organizationId` against incoming path parameters and return `403 Forbidden` on mismatch, while mutation controllers (`invoices`, `bank-accounts`) force override incoming body parameters to `req.user.organizationId`. Empirical HTTP requests confirmed that Org-A cannot read or write Org-B resources.
3. **SSRF Guard Validation**: Server-Side Request Forgery vulnerabilities in integration clients (such as `tally-client.ts`) allow attackers to pivot into internal networks or cloud instance metadata endpoints (`169.254.169.254`). `validateTallyHostUrl()` enforces HTTP/HTTPS scheme restrictions and evaluates IPv4 ranges to block loopback (`127.0.0.0/8`), private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and metadata IPs (`169.254.0.0/16`). `sendTallyXmlRequest()` rejects invalid URLs before initiating network calls, setting `redirect: 'error'`, a 5s timeout, and a 5MB payload limit.
4. **SSE Query Auth Extraction**: HTML5 `EventSource` in standard browser APIs cannot attach custom `Authorization: Bearer <token>` headers. Updating `JwtStrategy` `jwtFromRequest` to use `ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), ExtractJwt.fromUrlQueryParameter('token')])` allows stream connections via URL query parameter while remaining secure against unauthenticated access.

---

## 3. Caveats

- Outbound Tally integration requests to internal endpoints during development require setting `TALLY_ALLOWED_INTERNAL_HOSTS` environment variable to bypass the SSRF private IP check for intentional internal testing.
- No production backend code changes were required during this adversarial challenge, as the worker implementation in Milestone M4 already completely met all security criteria.

---

## 4. Conclusion

**Verdict: PASS**

Milestone M4 security, tenant isolation, and SSRF protections meet all empirical requirements:
- 119/119 E2E specs pass.
- Cross-tenant requests for `Org-B` data using `Org-A` JWT context are strictly rejected with `403 Forbidden`.
- SSRF protection in `tally-client.ts` successfully blocks `169.254.169.254`, `127.0.0.1`, `10.0.0.1`, `gopher://`, and `file://`.
- SSE authentication via `?token=` query parameter correctly authenticates valid JWTs (200 OK stream) and rejects invalid/missing tokens (401 Unauthorized).

---

## 5. Verification Method

To re-verify these empirical results independently:

1. **Execute E2E test suite**:
   ```bash
   npm --prefix apps/backend run test:e2e
   ```
   *Expected outcome*: 7 test suites passed, 119/119 specs passed.

2. **Execute backend unit test suite**:
   ```bash
   npm --prefix apps/backend test
   ```
   *Expected outcome*: 14 test suites passed, 50/50 specs passed (including `tally-client.spec.ts`).

3. **Inspect M4 stress test suite**:
   View `apps/backend/test/m4-challenger-stress.e2e-spec.ts` for detailed assertions covering tenant isolation, SSRF URL blocking, and SSE query param token extraction.
