import React from 'react';
import { 
    Cpu, 
    ShieldCheck, 
    Zap, 
    AlertCircle, 
    Info, 
    CheckCircle2, 
    XCircle,
    RotateCcw,
    Gauge,
    Clock,
    Wind
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useCfo } from '@/hooks/use-cfo';
import { toast } from 'sonner';

export function CfoAutoPilotSettings() {
    const { recommendations, refresh } = useCfo();
    const config = recommendations.context?.trustIntelligence?.autoPilot || { 
        mode: 'OFF', 
        maxImpact: 5, 
        delayMinutes: 30,
        recoveryAvailable: false, 
        shadowLogs: [],
        rollbackRate: 0,
        envUncertaintyScore: 0
    };
    const envUncertainty = recommendations.context?.trustIntelligence?.envUncertaintyScore || 0;
    
    const [mode, setMode] = React.useState(config.mode);
    const [sensitivity, setSensitivity] = React.useState(recommendations.context?.trustIntelligence?.sensitivity || 'BALANCED');
    const [impact, setImpact] = React.useState(config.maxImpact);
    const [delay, setDelay] = React.useState(config.delayMinutes);
    const [isSaving, setIsSaving] = React.useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/cfo-engine/state/auto-pilot', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, maxImpact: impact, delayMinutes: delay, shadowMode: true, sensitivity })
            });

            if (res.ok) {
                toast.success('Auto-Pilot settings updated');
                refresh();
            }
        } catch (err) {
            toast.error('Failed to update settings');
        } finally {
            setIsSaving(false);
        }
    };

    const getUncertaintyColor = (score: number) => {
        if (score > 40) return 'text-rose-400';
        if (score > 30) return 'text-amber-400';
        return 'text-emerald-400';
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Cpu className="w-24 h-24" />
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Zap className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-wider">CFO Auto-Pilot</h3>
                            <p className="text-xs text-slate-400 font-medium">Autonomous financial operator.</p>
                        </div>
                    </div>
                </div>

                {envUncertainty > 30 && (
                    <div className={cn(
                        "mb-6 p-4 rounded-xl border flex items-center gap-3",
                        envUncertainty > 40 ? "bg-rose-500/10 border-rose-500/20" : "bg-amber-500/10 border-amber-500/20"
                    )}>
                        <Wind className={cn("w-5 h-5", getUncertaintyColor(envUncertainty))} />
                        <div className="flex-1">
                            <p className={cn("text-[10px] font-black uppercase mb-0.5", getUncertaintyColor(envUncertainty))}>
                                {envUncertainty > 40 ? "Emergency Lock Active" : "Caution: High Market Variance"}
                            </p>
                            <p className="text-[10px] text-slate-400 leading-tight">
                                {envUncertainty > 40 
                                    ? "Unstable conditions detected. Auto-Pilot strictly disabled until stability returns." 
                                    : "High uncertainty detected. Auto-Pilot restricted to Safe Mode only."}
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {[
                        { id: 'OFF', label: 'Manual Control', desc: 'Fully disabled. Manual approval required.', icon: XCircle, color: 'text-slate-400' },
                        { id: 'SAFE_MODE', label: 'Safe Mode', desc: 'Auto-executes Low-Risk actions only.', icon: ShieldCheck, color: 'text-emerald-400' },
                        { id: 'ASSISTED_MODE', label: 'Assisted', desc: 'Med-risk reviews + automated Safe-mode.', icon: Zap, color: 'text-indigo-400' }
                    ].map((m) => (
                        <button
                            key={m.id}
                            disabled={envUncertainty > 40 && m.id !== 'OFF'}
                            onClick={() => setMode(m.id as any)}
                            className={cn(
                                "text-left p-4 rounded-xl border transition-all duration-200",
                                mode === m.id 
                                    ? "bg-white/5 border-white/20 ring-1 ring-white/10" 
                                    : "bg-transparent border-slate-800 hover:border-slate-700",
                                envUncertainty > 40 && m.id !== 'OFF' && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <m.icon className={cn("w-5 h-5 mb-2", mode === m.id ? m.color : "text-slate-600")} />
                            <h4 className={cn("text-xs font-black uppercase mb-1", mode === m.id ? "text-white" : "text-slate-500")}>{m.label}</h4>
                            <p className="text-[10px] text-slate-500 leading-snug">{m.desc}</p>
                        </button>
                    ))}
                </div>

                <div className="mb-8">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block">Engine Sensitivity</label>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { id: 'CONSERVATIVE', label: 'Conservative', desc: 'High trust required' },
                            { id: 'BALANCED', label: 'Balanced', desc: 'Default optimization' },
                            { id: 'AGGRESSIVE', label: 'Aggressive', desc: 'Growth prioritized' }
                        ].map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setSensitivity(s.id as any)}
                                className={cn(
                                    "p-3 rounded-xl border text-center transition-all",
                                    sensitivity === s.id ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-white/5 text-slate-500 hover:border-white/10"
                                )}
                            >
                                <p className="text-[10px] font-black uppercase">{s.label}</p>
                                <p className="text-[8px] font-bold opacity-50 uppercase mt-0.5">{s.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-8 pt-6 border-t border-slate-800/50">
                    {/* Impact Slider */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Gauge className="w-3 h-3" /> Max Burn Impact Threshold
                            </label>
                            <span className="text-[10px] font-black text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded uppercase">
                                {impact}% Limit
                            </span>
                        </div>
                        <Slider 
                            value={[impact]} 
                            onValueChange={([v]) => setImpact(v)} 
                            max={15} 
                            step={0.5} 
                            className="py-1"
                        />
                    </div>

                    {/* Delay Slider */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-3 h-3" /> Execution Delay Window
                            </label>
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded uppercase">
                                {delay} Minutes
                            </span>
                        </div>
                        <Slider 
                            value={[delay]} 
                            onValueChange={([v]) => setDelay(v)} 
                            min={15}
                            max={120} 
                            step={15} 
                            className="py-1"
                        />
                        <p className="text-[9px] text-slate-500 font-medium italic">
                            Wait time before any auto-action is applied. You can cancel during this window.
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <Info className="w-3 h-3" /> System Trust: {(100 - (config.rollbackRate * 100)).toFixed(0)}%
                            </div>
                            {config.rollbackRate > 0.1 && (
                                <p className="text-[9px] text-amber-500/80 font-black uppercase">Rollback Rate Detected: {(config.rollbackRate * 100).toFixed(0)}%</p>
                            )}
                        </div>
                        <Button 
                            size="sm" 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className="bg-indigo-600 hover:bg-indigo-500 text-[10px] font-black uppercase px-6"
                        >
                            {isSaving ? 'Saving...' : 'Lock Settings'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
