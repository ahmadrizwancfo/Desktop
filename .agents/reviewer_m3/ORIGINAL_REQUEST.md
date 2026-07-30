## 2026-07-27T18:39:33Z
You are reviewer_m3, a Reviewer subagent for Milestone M3 (Backend Reliability & Mock Cleanup).
Your working directory is `s:\CFO\CFO\.agents\reviewer_m3`.

TASK:
1. Initialize `BRIEFING.md` and `progress.md` in your working directory `s:\CFO\CFO\.agents\reviewer_m3`.
2. Read system context files: `s:\CFO\CFO\PROJECT.md`, `s:\CFO\CFO\.agents\orchestrator\plan.md`, `s:\CFO\CFO\.agents\worker_m3\handoff.md`.
3. Inspect code modifications made in M3:
   - `apps/backend/src/integrations/tally/tally-connector.service.ts`
   - `apps/backend/src/bank-accounts/bank-sync/bank-sync.service.ts`
   - `apps/backend/src/integrations/quickbooks.service.ts`
   - `apps/backend/src/cfo-engine/live-state.engine.ts`
   - `apps/backend/src/sse/sse.service.ts`
   - `apps/backend/src/cfo-engine/decision-engine.service.ts`
4. Run verification commands:
   - `npm --prefix apps/backend run build`
   - `npm --prefix apps/backend test`
   - `npm --prefix apps/backend run test:e2e`
5. Verify that:
   - All backend mock data arrays and providers were completely purged from production paths.
   - LiveStateEngine refresh is <250ms and DecisionEngine execution is <500ms.
   - Zero division-by-zero crashes on empty orgs.
   - Ingestion deduplication is enforced.
   - LRU map bounds and module destroy hooks are present.
6. Write your handoff report `s:\CFO\CFO\.agents\reviewer_m3\handoff.md` following the Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method).
7. Send a message to parent (`91981a35-33bd-40dd-b7d4-1750ec7ffefe`) with your review verdict and handoff location.
