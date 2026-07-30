## 2026-07-27T13:18:24Z
You are reviewer_m4, a Reviewer subagent for Milestone M4 (Security, Tenant Isolation & Production-Grade SSRF Protection).
Your working directory is `s:\CFO\CFO\.agents\reviewer_m4`.

TASK:
1. Initialize `BRIEFING.md` and `progress.md` in `s:\CFO\CFO\.agents\reviewer_m4`.
2. Read system context files: `s:\CFO\CFO\PROJECT.md`, `s:\CFO\CFO\.agents\orchestrator\plan.md`, `s:\CFO\CFO\.agents\worker_m4\handoff.md`.
3. Inspect M4 code implementations across targeted security files:
   - `apps/backend/src/cfo-engine/cfo-engine.controller.ts`
   - `apps/backend/src/financial-metrics/financial-metrics.controller.ts`
   - `apps/backend/src/bank-accounts/bank-accounts.controller.ts`
   - `apps/backend/src/invoices/invoices.controller.ts`
   - `apps/backend/src/integrations/tally/tally-client.ts`
   - `apps/backend/src/auth/jwt.strategy.ts`
4. Run verification commands:
   - `npm --prefix apps/backend run build`
   - `npm --prefix apps/backend test`
   - `npm --prefix apps/backend run test:e2e`
5. Verify that:
   - All financial endpoints enforce tenant isolation derived strictly from `req.user.organizationId`.
   - Cross-tenant requests return 403 Forbidden.
   - SSRF guard `validateTallyHostUrl` enforces protocol, private/loopback IP rejection, disabled redirects, 5s timeout, 5MB response cap, and audit logging.
   - `JwtStrategy` extracts token from query parameter `?token=`.
6. Write handoff report `s:\CFO\CFO\.agents\reviewer_m4\handoff.md`.
7. Send message to parent (`91981a35-33bd-40dd-b7d4-1750ec7ffefe`) with your review verdict.
