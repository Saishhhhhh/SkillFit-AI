import React, { useState } from 'react';
import { Map, Sparkles, Target, CheckCircle, Loader2 } from 'lucide-react';
import api, { endpoints } from '../../services/api';

export default function GrowthEngine({ analytics, profile }) {
    const [roadmap, setRoadmap] = useState(null);
    const [loading, setLoading] = useState(false);
    const [apiKey, setApiKey] = useState("");

    const handleGenerate = async () => {
        if (!apiKey) return alert("Please enter an API Key to generate roadmap.");

        setLoading(true);
        try {
            const missing = (analytics?.top_skills || [])
                .filter(s => !profile?.confirmed_skills?.some(cs => cs.toLowerCase() === s.name.toLowerCase()))
                .slice(0, 5) // Top 5 missing
                .map(s => s.name);

            if (missing.length === 0) {
                alert("You have all top skills! Great job.");
                setLoading(false);
                return;
            }

            const res = await api.post(endpoints.generateRoadmap, {
                api_key: apiKey,
                provider: "groq",
                current_role: "Aspiring Candidate",
                target_role: "Target Role",
                missing_skills: missing
            });
            setRoadmap(res);
        } catch (e) {
            alert("Roadmap Error: " + (e.response?.data?.detail || e.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow h-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl text-indigo-600 dark:text-indigo-300">
                    <Map className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Personalized Growth Engine</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Your AI-generated path to mastery.</p>
                </div>
            </div>

            {!roadmap ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm mx-auto text-sm leading-relaxed">
                        Generate a 3-month accelerated learning plan based on your unique skill gaps.
                    </p>

                    <div className="mb-6 max-w-xs mx-auto bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Groq API Key</p>
                            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline">Get Key &rarr;</a>
                        </div>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="gsk_..."
                            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-center transition-all placeholder:text-slate-400"
                        />
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-70 disabled:cursor-wait text-sm flex items-center gap-2 mx-auto"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {loading ? 'Analyzing Profile...' : 'Generate 3-Month Roadmap'}
                    </button>
                </div>
            ) : (
                <div className="space-y-8 animate-fade-in-up">
                    {/* Timeline */}
                    <div className="relative">
                        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-700 -z-10 hidden md:block"></div>
                        <div className="flex flex-col md:flex-row gap-4 overflow-x-auto pt-6 pb-6 hide-scrollbar relative">
                            {roadmap.monthly_plan.map((month, i) => (
                                <div key={i} className="flex-1 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative min-w-[240px] mt-2 mb-2">
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md border-4 border-white dark:border-slate-800 z-10 transition-transform group-hover:scale-110">
                                        {month.month}
                                    </div>
                                    <div className="mt-4 text-center">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2 truncate" title={month.focus_topic}>{month.focus_topic}</h4>
                                        <div className="flex flex-wrap justify-center gap-1 mb-3">
                                            {month.skills_to_learn.slice(0, 3).map(s => (
                                                <span key={s} className="text-[10px] bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{s}</span>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 italic line-clamp-3 leading-relaxed">"{month.project_idea}"</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Projects */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
                            <Target className="h-4 w-4 text-emerald-500" />
                            Portfolio Killer Projects
                        </h4>
                        <div className="grid md:grid-cols-2 gap-4">
                            {roadmap.portfolio_projects.map((proj, i) => (
                                <div key={i} className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                                    <h5 className="font-bold text-slate-800 dark:text-emerald-100 text-sm mb-2">{proj.title}</h5>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">{proj.description}</p>
                                    <div className="flex items-start gap-2 bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                                        <CheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                                        <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                                            Recruiter Hook: {proj.recruiter_hook}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
