import React from 'react';
import { CashflowTimelineWorkspace } from '@/components/cashflow/cashflow-timeline-workspace';
import { CfoCopilotPanel } from '@/components/copilot/cfo-copilot-panel';

export default function CashflowOperatingSystemPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
            {/* Header Title Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                        Predictive Financial Operating System
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                        90-Day Cash Flow Timeline • Real-Time LiveState Engine • Stateful AI Copilot
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold rounded-full">
                        2030-Grade Architecture
                    </span>
                </div>
            </div>

            {/* Multi-Panel Grid Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Center Workspace (Main Output Panel: 90-Day Cashflow Timeline) */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                    <CashflowTimelineWorkspace />
                </div>

                {/* Right Workspace (AI Copilot & Insights Panel) */}
                <div className="lg:col-span-5 xl:col-span-4 h-[650px] sticky top-6">
                    <CfoCopilotPanel />
                </div>
            </div>
        </div>
    );
}
