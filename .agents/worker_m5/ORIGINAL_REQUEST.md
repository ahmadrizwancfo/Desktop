## 2026-07-27T13:22:13Z

You are the UX, Performance & Frontend Mock Cleanup Worker for FounderCFO V19.
Your working directory is s:\CFO\CFO\.agents\worker_m5.
Please create your working directory s:\CFO\CFO\.agents\worker_m5 if it doesn't exist, and create your BRIEFING.md and progress.md.

Read s:\CFO\CFO\.agents\ORIGINAL_REQUEST.md, s:\CFO\CFO\PROJECT.md, and s:\CFO\CFO\.agents\orchestrator\plan.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your objective is to execute Milestone M5 (Real-Time UX & Component Performance Budgets + Frontend Mock Cleanup):
1. Purge all frontend mock financial data fallbacks in `apps/frontend/src/` (Operating Rule 12):
   - `apps/frontend/src/services/financial-service.ts`: Purge `MOCK_DASHBOARD_DATA`. Return clean empty state when backend API is unconfigured.
   - `apps/frontend/src/app/investor-readiness/page.tsx`: Purge fallbacks to `mockMetrics` & `mockReadiness`. Render clean zero/empty states.
   - `apps/frontend/src/app/settings/audit-trail/page.tsx`: Purge fallback to `mockAuditLogs`. Display empty table notice.
   - `apps/frontend/src/app/unit-economics/page.tsx`: Purge `mockMetrics`, `mockDecisions`, `mockCohorts` fallbacks. Render empty state notice.
   - `apps/frontend/src/components/dashboard/cash-flow-forecast.tsx`: Purge `DefaultCashFlowForecast` mock wrapper rendering hardcoded Feb/Mar cash flows.
   - `apps/frontend/src/components/dashboard/cfo-resolution-center.tsx`: Replace hardcoded `avgSalary = 85000` with transaction calculation or explicit empty fallback.
   - `apps/frontend/src/components/dashboard/monthly-comparison.tsx`: Purge `DefaultMonthlyComparison` mock wrapper rendering fake metrics.
   - `apps/frontend/src/components/dashboard/why-drill-down.tsx`: Replace `generateDrillDownData` mock function with real backend API drill-down parsing.
   - `apps/frontend/src/app/(dashboard)/integrations/page.tsx`: Purge `handleMockConnect` and fake timer loops. Connect to real backend integration endpoints.
2. Real-Time UX & SSE Reconnection (WS3):
   - `apps/frontend/src/hooks/use-living-dashboard.ts`: Pass JWT token as query param `?token=` in `EventSource` URL to resolve HTTP 401 SSE auth error. Add automatic reconnection (<2s reconnect limit).
   - `apps/frontend/src/app/(dashboard)/dashboard/page.tsx` & header: Add visual SSE connection status badge ("Live" / "Reconnecting" / "Disconnected"), live sync progress indicator, relative "Last updated X seconds ago" timestamp label, optimistic updates, and loading skeletons.
3. Component Performance Budget Verification:
   - Ensure LiveStateEngine refresh is under 250ms and Decision Engine execution under 500ms.

After implementation:
- Run frontend build/check or backend test suite (`npm --prefix apps/backend run test:e2e`).
- Write your handoff report to `s:\CFO\CFO\.agents\worker_m5\handoff.md`.
- Report back via send_message when complete.
