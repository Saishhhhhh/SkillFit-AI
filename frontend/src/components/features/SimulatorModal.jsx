import { useState } from 'react';
import { X, ArrowRight, TrendingUp, Target, AlertCircle } from 'lucide-react';
import api, { endpoints } from '../../services/api';
import { useApp } from '../../context/AppContext';

export default function SimulatorModal({ searchId, onClose }) {
    const { profile } = useApp();
    const [skillInput, setSkillInput] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSimulate = async () => {
        if (!skillInput) return;
        setLoading(true);
        try {
            const res = await api.post(endpoints.simulate(searchId), {
                profile_id: profile.profile_id,
                added_skills: [skillInput]
            });
            setResult(res);
        } catch (err) {
            console.error(err);
            alert("Simulation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Target className="h-5 w-5 text-indigo-600" />
                        Skill Simulator
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-slate-600 mb-4">
                        See how learning a new skill impacts your market value instantly.
                    </p>

                    <div className="flex gap-2 mb-6">
                        <input
                            type="text"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            placeholder="Enter a skill (e.g. Kubernetes)..."
                            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        />
                        <button
                            onClick={handleSimulate}
                            disabled={loading || !skillInput}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-70 transition-colors"
                        >
                            {loading ? 'Simulating...' : 'Run Simulation'}
                        </button>
                    </div>

                    {result && !result.error && (
                        <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 animate-slide-up">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <div className="text-xs font-bold text-indigo-500 uppercase tracking-wide">Impact Analysis</div>
                                    <div className="text-lg font-semibold text-slate-900">After learning "{skillInput}"</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-indigo-600">
                                        +{(result.score_delta || 0).toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-indigo-400">Match Score Increase</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Market Reach Improved:</span>
                                    <span className="font-medium text-emerald-600 flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" />
                                        {(result.reach_delta || 0) > 0 ? `+${result.reach_delta}%` : 'No change'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Jobs Qualified:</span>
                                    <span className="font-medium text-slate-900">{result.jobs_improved || 0} jobs match better</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {result?.error && (
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-amber-700 text-sm animate-pulse">
                            <AlertCircle className="h-4 w-4 inline mr-2" />
                            {result.error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
