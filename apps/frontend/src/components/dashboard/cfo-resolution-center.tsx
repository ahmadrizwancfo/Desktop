'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShieldAlert, Users, Code, Trash2, 
    Zap, Calculator, ArrowRight, ShieldCheck,
    FileText, Building, Hammer, Lock
} from 'lucide-react';
import { CFOState, formatCurrency, useCfoStateStore } from '@/store/cfo-state-store';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface CfoResolutionCenterProps {
    state: CFOState;
}

interface ResolutionOptions {
    locked: boolean;
    lockReason?: string;
    requiredActions?: string[];
    options: any[];
}

export function CfoResolutionCenter({ state }: CfoResolutionCenterProps) {
    const { summary, behavioralAudit } = state;
    const resolutionPath = useCfoStateStore(s => s.resolutionPath);
    const setResolutionPath = useCfoStateStore(s => s.setResolutionPath);
    const [complianceStep, setComplianceStep] = useState(0);

    const isChaotic = behavioralAudit?.riskProfile === 'CHAOTIC';

    const { data: resolutionOptions } = useQuery<ResolutionOptions>({
        queryKey: ['resolution-options'],
        queryFn: async () => {
            const res = await apiClient.get('/cfo-engine/resolution/options');
            return res.data;
        },
        enabled: !!state,
    });
    
    // ──────────────────────────────────────────────────────────────────────────
    // MASTERMIND MATH: THE REPUTATION SHIELD (INDIA SPECIAL)
    // ──────────────────────────────────────────────────────────────────────────
    const headCount = state.behavioralAudit?.teamStability?.headcount || 4;
    const avgSalary = 85000; // Mock avg
    const statutoryDues = (summary.ghostLiabilities || 0) + (headCount * avgSalary * 0.12); // PF/ESI + GST/TDS
    const severanceCost = headCount * avgSalary; // 1 month notice
    const mcaClosingFees = 125000; // STK-2 + Liquidation filings
    
    const totalShutdownReserve = statutoryDues + severanceCost + mcaClosingFees;
    const netExitCapital = Math.max(0, summary.cashInBank - totalShutdownReserve);
    
    // Integrity Score: Higher if statutory dues are covered by current cash
    const integrityScore = Math.min(100, Math.round((summary.cashInBank / totalShutdownReserve) * 100));

    // Service Pivot Math
    const billableResources = Math.ceil(headCount * 0.75); // 75% billable
    const targetHourlyRate = Math.ceil(summary.monthlyExpenses / (billableResources * 140)); // 140 hrs/mo

    const paths = [
        {
            id: 'mna',
            title: 'Acquire-hire / M&A',
            subtitle: 'The Team Save',
            icon: Users,
            description: 'Preserve team dignity. Pivot from product to talent value.',
            action: 'Generate Tech Audit Snapshot',
            details: `Team of ${headCount} built ${state.behavioralAudit?.featureVelocity || '12'} modules in ${state.behavioralAudit?.velocityPeriod || '6'}mo. Plug-and-Play for Series B+.`
        },
        {
            id: 'service',
            title: 'Pivot to Service',
            subtitle: 'The Cash-Flow Bridge',
            icon: Code,
            description: 'Stop burn immediately by converting the team into a dev shop.',
            action: 'View Service Pipeline',
            details: `Need to bill ₹${targetHourlyRate}/hr across ${billableResources} devs to hit Zero-Burn.`
        },
        {
            id: 'shutdown',
            title: 'Managed Shutdown',
            subtitle: 'The Reputation Shield',
            icon: ShieldCheck,
            description: 'The "Mean CFO" Mandate: Pay the Govt and Employees first or face criminal liability.',
            action: 'Lock Shutdown Reserve',
            details: `Reputation Integrity: ${integrityScore}% • Settle Statutory Dues immediately.`
        },
        {
            id: 'bridge',
            title: 'Phoenix Raise',
            subtitle: 'The Founder Bridge',
            icon: Zap,
            description: 'A last-ditch effort. Shutdown Reserve remains FROZEN.',
            action: 'Calculate Bridge Requirement',
            details: `Need ₹${formatCurrency(summary.netBurn * 3)} while locking ₹${formatCurrency(totalShutdownReserve)} for safety.`
        }
    ];

    return (
        <section className="w-full mt-8">
            <div className="bg-slate-900 border border-slate-700/50 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                {/* Background Texture */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 rounded-xl bg-slate-800 border border-slate-700">
                            <ShieldAlert className="w-6 h-6 text-slate-400" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Mastermind Verdict</span>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">The Survival Levers Are Exhausted</h2>
                        </div>
                    </div>

                    <p className="text-xl text-slate-400 font-medium mb-12 max-w-2xl leading-relaxed">
                        The current trajectory leads to a hard stop in <span className="text-white underline decoration-slate-600">{Math.round(state.summary.runwayMonths * 30.4)} days</span>. 
                        To protect your reputation and remaining capital, select a <span className="text-slate-200">Resolution Path</span> below.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {paths.map((path) => {
                            const isSelected = resolutionPath === path.id;
                            const Icon = path.icon;
                            
                            return (
                                <button
                                    key={path.id}
                                    onClick={() => setResolutionPath(path.id as any)}
                                    className={cn(
                                        "p-8 rounded-[2rem] border text-left transition-all group relative overflow-hidden",
                                        isSelected ? 
                                        "bg-slate-800 border-slate-600 ring-2 ring-slate-500" : 
                                        "bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50",
                                        path.id === 'bridge' && isChaotic && "opacity-60 grayscale-[0.5]"
                                    )}
                                >
                                    {path.id === 'bridge' && isChaotic && (
                                        <div className="absolute top-4 right-4 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg flex items-center gap-1.5 z-20">
                                            <Lock className="w-3 h-3 text-rose-500" />
                                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">Locked</span>
                                        </div>
                                    )}

                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-colors",
                                        isSelected ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-500 group-hover:text-slate-300",
                                        path.id === 'bridge' && isChaotic && "bg-rose-500/5 text-rose-500/50"
                                    )}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    
                                    <div className="mb-6">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{path.subtitle}</p>
                                        <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-tight">{path.title}</h3>
                                    </div>

                                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 h-12 overflow-hidden">
                                        {path.description}
                                    </p>

                                    <div className={cn(
                                        "inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all",
                                        isSelected ? "text-white" : "text-slate-600 group-hover:text-slate-400"
                                    )}>
                                        {isSelected ? "Active Path ✓" : path.id === 'bridge' && isChaotic ? "CHAOTIC LOCK ✗" : "Review Mechanics →"}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <AnimatePresence mode="wait">
                        {resolutionPath && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="mt-8 p-10 rounded-[2.5rem] bg-slate-800/50 border border-slate-700 overflow-hidden relative"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
                                    <div>
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Tactical Mechanics</h4>
                                        <p className="text-white font-medium text-lg leading-relaxed mb-6 italic">
                                            "{paths.find(p => p.id === resolutionPath)?.details}"
                                        </p>
                                        <button className="px-6 py-3 rounded-xl bg-white text-slate-900 text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
                                            {paths.find(p => p.id === resolutionPath)?.action}
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {resolutionPath === 'shutdown' && (
                                         <div className="p-6 rounded-2xl bg-black/40 border border-slate-700">
                                             <div className="flex items-center justify-between mb-6">
                                                 <div className="flex items-center gap-3">
                                                     <Calculator className="w-5 h-5 text-slate-400" />
                                                     <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Compliance Settlement Calculator</h5>
                                                 </div>
                                                 <div className={cn(
                                                     "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border",
                                                     integrityScore > 90 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                                 )}>
                                                     Integrity: {integrityScore}%
                                                 </div>
                                             </div>
                                             
                                             <div className="space-y-3 mb-6">
                                                 <div className="flex justify-between items-center text-[10px]">
                                                     <span className="text-slate-500 font-bold uppercase tracking-tighter">Statutory Dues (PF/ESI/GST)</span>
                                                     <span className="text-rose-400/80 font-mono">-{formatCurrency(statutoryDues)}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center text-[10px]">
                                                     <span className="text-slate-500 font-bold uppercase tracking-tighter">Notice Pay / Gratuity ({headCount} Staff)</span>
                                                     <span className="text-rose-400/80 font-mono">-{formatCurrency(severanceCost)}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center text-[10px]">
                                                     <span className="text-slate-500 font-bold uppercase tracking-tighter">MCA Strike-off (STK-2) Fees</span>
                                                     <span className="text-rose-400/80 font-mono">-{formatCurrency(mcaClosingFees)}</span>
                                                 </div>
                                                 <div className="h-px bg-slate-800 my-2" />
                                                 <div className="flex justify-between items-center">
                                                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distributable Exit Cash</span>
                                                     <span className="text-xl font-black text-emerald-400 font-mono">{formatCurrency(netExitCapital)}</span>
                                                 </div>
                                             </div>
                                             
                                             <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-[10px] text-rose-400/80 leading-relaxed font-medium">
                                                 <ShieldAlert className="w-3.5 h-3.5 inline mr-2 mb-0.5" />
                                                 Personal liability risk is <strong>CRITICAL</strong> if Statutory Dues are not prioritized over Vendor payments.
                                             </div>
                                         </div>
                                     )}

                                     {resolutionPath === 'bridge' && (
                                         <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                                            <div className="flex items-center gap-3 mb-6">
                                                <Zap className={cn("w-5 h-5", isChaotic ? "text-rose-500" : "text-amber-500")} />
                                                <h5 className="text-[10px] font-black uppercase tracking-widest">
                                                    {isChaotic ? "Phoenix Raise (LOCKED)" : "Phoenix Raise Mechanics"}
                                                </h5>
                                            </div>
                                            
                                            {isChaotic ? (
                                                <div className="space-y-6">
                                                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                                        <p className="text-sm text-rose-400 font-bold leading-relaxed mb-4">
                                                            {resolutionOptions?.lockReason || "You are currently flying in CHAOTIC mode. Advanced survival options are locked until statutory integrity is restored."}
                                                        </p>
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-black text-rose-500/70 uppercase tracking-widest mb-2">Required Actions:</p>
                                                            {resolutionOptions?.requiredActions?.map((action, i) => (
                                                                <div key={i} className="flex items-center gap-2 text-[10px] text-rose-400 font-medium">
                                                                    <div className="w-1 h-1 rounded-full bg-rose-500" />
                                                                    {action}
                                                                </div>
                                                            )) || (
                                                                <div className="flex items-center gap-2 text-[10px] text-rose-400 font-medium">
                                                                    <div className="w-1 h-1 rounded-full bg-rose-500" />
                                                                    Restore statutory compliance in Zoho/Tally
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button 
                                                        disabled
                                                        className="w-full px-6 py-4 rounded-xl bg-slate-800 text-slate-500 text-xs font-black uppercase tracking-widest cursor-not-allowed border border-slate-700"
                                                    >
                                                        Unlock Statutory Integrity First
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                                                        The Mastermind has <strong>FROZEN</strong> {formatCurrency(totalShutdownReserve)} as a mandatory reserve. 
                                                        You can only spend capital raised <em>above</em> this threshold.
                                                    </p>
                                                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Liquidation Reserve</span>
                                                            <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Locked</span>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                         </div>
                                     )}

                                     {resolutionPath === 'service' && (
                                        <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                                            <div className="flex items-center gap-3 mb-6">
                                                <Code className="w-5 h-5 text-blue-500" />
                                                <h5 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Service Pivot Math</h5>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                                    <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Target Billing</p>
                                                    <p className="text-lg font-black text-white">₹{targetHourlyRate}/hr</p>
                                                </div>
                                                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                                    <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">Billable Devs</p>
                                                    <p className="text-lg font-black text-white">{billableResources}</p>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-4 italic text-center">"Assumes 140 billable hours/month per resource at 75% capacity."</p>
                                        </div>
                                     )}

                                     {resolutionPath === 'mna' && (
                                         <div className="flex flex-col justify-center">
                                             <div className="space-y-3">
                                                 <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                                     <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                                     <span className="text-xs font-bold text-emerald-400">Reputation Protected (Low Bankruptcy Risk)</span>
                                                 </div>
                                                 <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                                     <Users className="w-4 h-4 text-blue-500" />
                                                     <span className="text-xs font-bold text-blue-400">Soft Landing for {headCount} Staff</span>
                                                 </div>
                                                 <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                                                     <p className="text-[8px] text-slate-500 uppercase tracking-widest mb-1">M&A Asset Profile</p>
                                                     <p className="text-[10px] text-white leading-relaxed">
                                                         Infrastructure Efficiency: 92% • Code Velocity: {state.behavioralAudit?.featureVelocity || 'Fast'} • IP Risk: Low
                                                     </p>
                                                 </div>
                                             </div>
                                         </div>
                                     )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </section>
    );
}
