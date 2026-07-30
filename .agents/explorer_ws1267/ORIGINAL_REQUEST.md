## 2026-07-27T15:53:46Z
You are the Backend, Security & Data Integrity Explorer for FounderCFO V19.
Your working directory is s:\CFO\CFO\.agents\explorer_ws1267.
Please create your working directory s:\CFO\CFO\.agents\explorer_ws1267 if it doesn't exist, and create your BRIEFING.md and progress.md.

Read s:\CFO\CFO\.agents\ORIGINAL_REQUEST.md and s:\CFO\CFO\PROJECT.md.

Audit the codebase in `apps/backend/src/` focusing on Workstreams 1, 2, 6, and 7:
1. Workstream 1 — Reliability:
   - Examine `LiveStateEngineService`, `DecisionEngineService`, `TallyConnectorService`, and `SseService`.
   - Identify null dereferences, race conditions, event subscription leaks, duplicate event emissions, memory leaks, stale cached state, shutdown cleanup issues, zero transaction org handling, idempotency issues during repeated sync requests.
2. Workstream 2 — Security & SSRF Protection:
   - Audit all financial endpoints. Check `organizationId` derivation from authenticated JWT context (`req.user.organizationId`).
   - Check cross-tenant access protections and DTO validation.
   - Check SSRF protections for Tally hosts (http/https validation, internal IP/hostname rejection, allow/deny rules, redirect prevention, request timeouts, response payload size limits, audit logging).
3. Workstream 6 — Rule-Based Financial Determinism:
   - Check financial calculations, metrics, balances, forecasts, and canonical transformations for non-deterministic behavior (floating-point issues, async processing, event ordering, race conditions, caching).
4. Workstream 7 — Financial Data Integrity (P0):
   - Check ingestion pipeline: transaction IDs (stable & immutable), duplicate import handling, audit traceability to original source, debit/credit consistency, partial sync failure recovery.
5. Critical Operating Rule Audit:
   - Check production code paths (`apps/backend/src/`) for ANY mock, placeholder, or simulated financial data (Rule 12). If found, record exact file and line numbers.

Write your comprehensive findings and evidence chains to `s:\CFO\CFO\.agents\explorer_ws1267\handoff.md`.
Include:
- Files to modify
- Specific bug descriptions & line numbers
- Proposed targeted fixes
- Implementation risk, rollback strategy, user impact
- Verification methods for each fix

Report back via send_message when complete.
