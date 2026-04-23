import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Flame, 
    AlertTriangle, 
    Lightbulb, 
    ArrowRight, 
    ChevronRight, 
    Zap,
    TrendingUp,
    ShieldAlert,
    Clock,
    Activity,
    ShieldQuestion,
    Plus,
    RotateCcw,
    Cpu,
    X,
    Wind
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface CfoActionItem {
    id: string;
    title: string;
    impact: string;
    urgency: 'IMMEDIATE' | 'HIGH' | 'MEDIUM';
    priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM';
    reasoning: string;
    description: string;
    type: 'RISK' | 'GROWTH' | 'LIQUIDITY' | 'OPERATIONAL';
    status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
    verificationStatus: 'VERIFIED' | 'UNVERIFIED' | 'CONTRADICTED';
    verificationConfidence: number;
    verificationNotes?: string;
    verificationWindow?: number;
    isUnderReview?: boolean;
    claimedAt?: string;
    dueDate: string;
    isExecutable?: boolean;
    executionMode: 'ONE_CLICK_APPLY' | 'REVIEW_REQUIRED' | 'APPROVAL_REQUIRED' | 'SUGGESTED';
    executionPayload?: any;
    isSuppressed?: boolean;
    suppressionReason?: string;
    appliedAt?: string;
    appliedBy?: string;
    approvalStatus?: 'NOT_APPLICABLE' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    executionLogs?: any[];
}

interface AutonomousCfoRecommendations {
    priorityActions: CfoActionItem[];
    warnings: string[];
    opportunities: CfoActionItem[];
    summary: string;
    cfoRecommendation: 'APPROVE' | 'WARN' | 'BLOCK';
    context?: {
        confidence: number;
        complianceScore: number;
        cfoAccuracyScore?: number;
        isRecalibrating?: boolean;
        trustIntelligence?: {
            envUncertaintyScore: number;
            autoPilot: {
                pendingActions: any[];
                delayMinutes: number;
            }
        }
    };
}

interface CfoActionCenterProps {
    recommendations: AutonomousCfoRecommendations | null;
    activeMandates?: any[];
    onClaim?: (id: string) => void;
}

export function CfoActionCenter({ recommendations, activeMandates = [], onClaim }: CfoActionCenterProps) {
    if (!recommendations) return null;

    const { priorityActions, warnings, opportunities, summary } = recommendations;
    const pendingActions = recommendations.context?.trustIntelligence?.autoPilot?.pendingActions || [];
    const envUncertainty = recommendations.context?.trustIntelligence?.envUncertaintyScore || 0;

    const handleCancelAutoPilot = async (logId: string) => {
        try {
            await apiClient.post(`/cfo-engine/state/auto-pilot-cancel/${logId}`);
            toast.success('Auto-Pilot execution cancelled');
            window.location.reload();
        } catch (error) {
            toast.error('Failed to cancel execution');
        }
    };

    return (
        <div className="space-y-8">
            {/* 1. CFO Summary Banner */}
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-5 flex items-center gap-4"
            >
                <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 opacity-60">Autonomous CFO Status</p>
                    <p className="text-sm font-bold text-white tracking-tight">{summary}</p>
                </div>
                {activeMandates.length > 0 && (
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 opacity-60">Execution</p>
                        <p className="text-sm font-black text-rose-400">{activeMandates.filter(m => m.status === 'DONE').length}/{activeMandates.length} Done</p>
                    </div>
                )}
            </motion.div>

            {/* 🌪️ ENVIRONMENT UNCERTAINTY WARNING */}
            {envUncertainty > 40 && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-rose-500/20">
                    <Wind className="w-5 h-5 text-rose-400 animate-pulse" />
                    <div>
                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-none mb-1">Environmental Lock Active</p>
                        <p className="text-xs font-bold text-white">Auto-Pilot paused due to unstable conditions. Manual review required for all actions.</p>
                    </div>
                </div>
            )}

            {/* 2. Upcoming Auto-Pilot Queue */}
            {pendingActions.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Upcoming Auto-Pilot Actions</h2>
                    </div>
                    <div className="space-y-3">
                        {pendingActions.map((log: any) => {
                            const eta = new Date(log.executeAt);
                            const minutesLeft = Math.max(0, Math.ceil((eta.getTime() - Date.now()) / (1000 * 60)));

                            return (
                                <motion.div 
                                    key={log.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-emerald-500/[0.03] border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <Cpu className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-white leading-tight uppercase mb-0.5">{log.action?.title}</h4>
                                            <p className="text-[10px] text-slate-500 font-medium">Auto-Pilot will apply in <span className="text-emerald-400 font-black">{minutesLeft} minutes</span>. Expected Impact: {log.action?.impact}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleCancelAutoPilot(log.id)}
                                        className="p-2 hover:bg-rose-500/20 rounded-lg transition-colors group-hover:opacity-100 opacity-50 flex items-center gap-2"
                                    >
                                        <X className="w-4 h-4 text-rose-500" />
                                        <span className="text-[10px] font-black text-rose-500 uppercase">Cancel</span>
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 3. Survival Mandates */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Survival Mandates</h2>
                        {recommendations.context?.cfoAccuracyScore && (
                            <div className="ml-4 px-2 py-0.5 bg-slate-800 rounded text-[9px] font-black text-slate-400 border border-slate-700 flex items-center gap-2">
                                CFO ACCURACY: <span className={cn(
                                    recommendations.context.cfoAccuracyScore >= 80 ? 'text-emerald-400' : 'text-amber-400',
                                    recommendations.context.isRecalibrating && "animate-pulse"
                                )}>
                                    {Math.round(recommendations.context.cfoAccuracyScore)}%
                                </span>
                                {envUncertainty > 30 && (
                                    <span className="text-[7px] text-amber-500 uppercase tracking-tighter border-l border-slate-600 pl-2 flex items-center gap-1">
                                        <Wind className="w-2 h-2" /> High Variance
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    {priorityActions.map((mandate) => {
                        const latestLog = mandate.executionLogs?.[0];
                        const classification = latestLog?.classification;
                        const isDone = mandate.status === 'DONE';
                        const isVerified = mandate.verificationStatus === 'VERIFIED';
                        const isContradicted = mandate.verificationStatus === 'CONTRADICTED';
                        const isUnderReview = mandate.isUnderReview;
                        const confidence = mandate.verificationConfidence || 0;
                        const confidenceLabel = confidence >= 70 ? 'High' : confidence >= 30 ? 'Medium' : 'Low';
                        const confidenceColor = confidence >= 70 ? 'text-emerald-400' : confidence >= 30 ? 'text-amber-400' : 'text-slate-400';
                        const showContextInsight = classification === 'GOOD_DECISION_BAD_OUTCOME';
                        const isAutoPilotTriggered = mandate.appliedBy === 'AUTOPILOT';

                        const handleApply = async (id: string) => {
                            try {
                                await apiClient.post(`/cfo-engine/state/mandate-apply/${id}`);
                                window.location.reload();
                            } catch (error) { console.error('Apply failed:', error); }
                        };

                        const handleUndo = async (id: string) => {
                            try {
                                await apiClient.post(`/cfo-engine/state/mandate-undo/${id}`);
                                window.location.reload();
                            } catch (error) { console.error('Undo failed:', error); }
                        };

                        return (
                            <motion.div 
                                key={mandate.id}
                                className={cn(
                                    "group relative bg-[#0a0f1e] border rounded-2xl p-6 transition-all",
                                    isDone ? "border-emerald-500/20 bg-emerald-500/[0.02]" : "border-white/5",
                                    (isContradicted && !isUnderReview) && "border-rose-500/40 bg-rose-500/[0.04]",
                                    isUnderReview && "border-amber-500/30 bg-amber-500/[0.02]"
                                )}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className={cn("text-lg font-black tracking-tight", isDone ? "text-emerald-400" : "text-white")}>{mandate.title}</h3>
                                            {isVerified && (
                                                <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                                                    <Zap className="w-3 h-3" /> Verified
                                                </span>
                                            )}
                                            {isAutoPilotTriggered && (
                                                <span className="flex items-center gap-1 bg-violet-500/20 text-violet-400 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                                                    <Cpu className="w-3 h-3" /> Auto-Pilot
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                                                mandate.priority === 'IMMEDIATE' ? "bg-red-500 text-white" : "bg-orange-500/20 text-orange-400"
                                            )}>{mandate.priority}</span>
                                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Due {new Date(mandate.dueDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    {!isDone && (
                                        <div className="flex flex-col items-end gap-2">
                                            <button 
                                                onClick={() => handleApply(mandate.id)}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/50 rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                                            >
                                                ⚡ Apply Instantly
                                            </button>
                                        </div>
                                    )}
                                    {isDone && (
                                        <div className="flex flex-col items-end gap-2">
                                            <button 
                                                onClick={() => handleUndo(mandate.id)}
                                                className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-widest flex items-center gap-1 transition-colors"
                                            ><RotateCcw className="w-3 h-3" /> Rollback (Undo)</button>
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed font-sm">{mandate.description}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* 4. Opportunities */}
            {opportunities.length > 0 && (
                <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 px-2">
                        <Lightbulb className="w-4 h-4 text-emerald-500" />
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Scaling Opportunities</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {opportunities.map((opp, i) => (
                            <div key={i} className="bg-white/5 border border-white/5 hover:border-emerald-500/30 rounded-2xl p-5 transition-all cursor-pointer group">
                                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-emerald-500" />{opp.title}</h4>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed mb-3">{opp.reasoning}</p>
                                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-500">Expected: {opp.impact}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
