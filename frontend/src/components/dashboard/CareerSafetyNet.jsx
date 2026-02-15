import React, { useState } from 'react';
import { ArrowRight, BookOpen, Briefcase, Loader2 } from 'lucide-react';
import api, { endpoints } from '../../services/api';

export default function CareerSafetyNet({ profile }) {
    const [pivots, setPivots] = useState(null);
    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState("");

    const handleExplore = async () => {
        if (!apiKey) return alert("Please enter an API Key to explore pivots.");

        setLoading(true);
        try {
            const res = await api.post(endpoints.suggestPivot, {
                api_key: apiKey,
                provider: "groq",
                current_role: "Current Profile",
                current_skills: profile?.confirmed_skills || []
            });
            setPivots(res.pivots);
        } catch (e) {
            alert("Pivot Error: " + (e.response?.data?.detail || e.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow h-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/40 rounded-xl text-purple-600 dark:text-purple-300">
                    <ArrowRight className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Career Safety Net</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Explore adjacent roles you can pivot to.</p>
                </div>
            </div>

            {!pivots ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm mx-auto text-sm leading-relaxed">
                        Find 3 high-overlap roles you can switch to with minimal effort.
                    </p>

                    <div className="mb-6 max-w-xs mx-auto bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Groq API Key</p>
                            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline">Get Key &rarr;</a>
                        </div>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="gsk_..."
                            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 text-center transition-all placeholder:text-slate-400"
                        />
                    </div>

                    <button
                        onClick={handleExplore}
                        disabled={loading}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-200 dark:shadow-none disabled:opacity-70 disabled:cursor-wait text-sm flex items-center gap-2 mx-auto"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                        {loading ? 'Analyzing Skills...' : 'Explore Pivot Options'}
                    </button>
                </div>
            ) : (
                <div className="space-y-4 animate-fade-in-up">
                    {pivots.map((pivot, i) => (
                        <div key={i} className="p-5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-purple-200 dark:hover:border-purple-500/50 transition-all shadow-sm group">
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{pivot.role}</h4>
                                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-200 dark:border-green-800">
                                    {pivot.overlap_percentage}% Overlap
                                </span>
                            </div>

                            <div className="flex items-center gap-2 mb-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                <Briefcase className="h-4 w-4 text-slate-400" />
                                <span>Avg. Salary: <span className="text-slate-700 dark:text-slate-300">{pivot.salary_potential}</span></span>
                            </div>

                            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-100 dark:border-purple-800/30">
                                <span className="text-[10px] uppercase font-bold text-purple-400 dark:text-purple-300 block mb-2 tracking-wider">Bridge Skills Needed</span>
                                <div className="flex flex-wrap gap-2">
                                    {pivot.bridge_skills.map(s => (
                                        <span key={s} className="text-xs font-medium text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-purple-100 dark:border-slate-600 shadow-sm">{s}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
