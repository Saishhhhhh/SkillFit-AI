import React, { useState } from 'react';
import { Sparkles, Loader2, Target, CheckCircle } from 'lucide-react';
import api, { endpoints } from '../../services/api';

export default function SkillSimulator({ jobSearch, profile }) {
    const [simSkill, setSimSkill] = useState("");
    const [simResult, setSimResult] = useState(null);
    const [simLoading, setSimLoading] = useState(false);

    const handleSimulation = async () => {
        if (!simSkill) return;
        setSimLoading(true);
        try {
            const res = await api.post(endpoints.simulate(jobSearch.taskId), {
                profile_id: profile.profile_id,
                added_skills: [simSkill]
            });
            setSimResult(res);
        } catch (err) {
            console.error(err);
        } finally {
            setSimLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 dark:from-indigo-900 dark:to-slate-900 p-6 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none text-white h-full flex flex-col justify-between relative overflow-visible">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

            <div>
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2 relative z-10">
                    <Sparkles className="h-5 w-5 text-indigo-200 animate-pulse" />
                    Growth Simulator
                </h3>
                <p className="text-indigo-100 dark:text-indigo-300 text-[11px] mb-4 leading-relaxed relative z-10 opacity-80">
                    See how your market value jumps by adding a single high-demand skill.
                </p>

                <div className="space-y-2 relative z-10">
                    <div className="relative group">
                        <input
                            type="text"
                            value={simSkill}
                            onChange={(e) => setSimSkill(e.target.value)}
                            placeholder="e.g. Docker, AWS..."
                            className="w-full px-4 py-2.5 bg-white/10 dark:bg-slate-800/50 border border-white/20 dark:border-white/10 rounded-xl text-white text-sm placeholder:text-indigo-200 dark:placeholder:text-slate-500 outline-none focus:bg-white/20 focus:scale-[1.01] transition-all duration-300"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-300 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500"></div>
                    </div>

                    <button
                        onClick={handleSimulation}
                        disabled={simLoading || !simSkill}
                        className="w-full py-2.5 bg-white dark:bg-indigo-500 text-indigo-600 dark:text-white rounded-xl font-bold text-sm hover:bg-indigo-50 dark:hover:bg-indigo-400 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {simLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" /> Analysing...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                Simulate <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Results Area */}
            {simResult && !simResult.error && (
                <div className="mt-4 pt-4 border-t border-white/10 animate-fade-in-up">
                    <div className="bg-white/10 dark:bg-black/20 p-3 rounded-xl border border-white/10 backdrop-blur-sm group cursor-help relative transition-colors hover:bg-white/15">
                        <div className="text-[9px] text-indigo-100 dark:text-indigo-300 uppercase tracking-widest font-black mb-1 opacity-80 flex justify-between">
                            <span>Projected Reach</span>
                            <span className="text-emerald-300 flex items-center gap-1 font-bold">+{(simResult.new_reach - (simResult.original_reach || 0)).toFixed(1)}%</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black tracking-tighter drop-shadow-sm">{Math.round(simResult.new_reach || 0)}%</span>
                            <span className="text-[10px] font-medium text-indigo-200">of market</span>
                        </div>

                        {/* Tooltip */}
                        <div className="invisible group-hover:visible absolute bottom-full left-0 mb-2 p-3 bg-slate-900 text-white text-[10px] rounded-xl shadow-2xl z-30 w-48 leading-relaxed animate-slide-up border border-slate-700">
                            Percentage of jobs where you match &gt;70% requirements after learning <strong>{simSkill}</strong>.
                        </div>
                    </div>

                    <div className="flex justify-between items-center px-1 mt-3">
                        <span className="text-[10px] text-indigo-100 dark:text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Target className="h-3 w-3" /> New Avg. Score
                        </span>
                        <span className="text-base font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
                            {(simResult.new_avg_score || 0).toFixed(1)}%
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
