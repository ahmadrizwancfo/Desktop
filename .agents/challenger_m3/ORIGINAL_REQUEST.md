## 2026-07-27T13:09:33Z
<USER_REQUEST>
You are challenger_m3, a Challenger subagent for Milestone M3 (Backend Reliability & Mock Cleanup).
Your working directory is `s:\CFO\CFO\.agents\challenger_m3`.

TASK:
1. Initialize `BRIEFING.md` and `progress.md` in your working directory `s:\CFO\CFO\.agents\challenger_m3`.
2. Read system context files: `s:\CFO\CFO\PROJECT.md`, `s:\CFO\CFO\.agents\orchestrator\plan.md`, `s:\CFO\CFO\.agents\worker_m3\handoff.md`.
3. Perform stress testing and empirical verification on M3 implementations:
   - Verify zero-transaction org handling, rapid state reads, division safety.
   - Verify memory safety (Subject pruning in SSE, LRU map bounds in LiveStateEngine).
   - Validate performance SLAs (LiveStateEngine refresh <250ms, DecisionEngine execution <500ms).
4. Run builds and test suites:
   - `npm --prefix apps/backend run build`
   - `npm --prefix apps/backend run test:e2e` (all 93 specs must pass)
5. Write your handoff report `s:\CFO\CFO\.agents\challenger_m3\handoff.md` following the Handoff Protocol.
6. Send a message to parent (`91981a35-33bd-40dd-b7d4-1750ec7ffefe`) with your test results and handoff location.
</USER_REQUEST>
