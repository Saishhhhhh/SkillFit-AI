import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Search, MapPin, Key, HelpCircle, CheckCircle2, Sparkles, Target, Zap, Briefcase, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { useApp } from '../context/AppContext';
import api, { endpoints } from '../services/api';

export default function ResumeReview() {
    const { profile, setJobSearch, setProfile } = useApp();
    const navigate = useNavigate();

    // Redirect if no profile
    useEffect(() => {
        if (!profile) navigate('/');
    }, [profile, navigate]);

    const [skills, setSkills] = useState(() => {
        const rawSkills = profile?.skills || [];
        const skillStrings = rawSkills.map(s => (typeof s === 'object' ? s.name : s));
        return [...new Set(skillStrings)];
    });
    const [newSkill, setNewSkill] = useState("");

    const [role, setRole] = useState("");
    const [location, setLocation] = useState("India");
    const [apiKey, setApiKey] = useState("");

    const [showRoleModal, setShowRoleModal] = useState(false);
    const [localApiKey, setLocalApiKey] = useState("");
    const [aiRoleQuery, setAiRoleQuery] = useState("");
    const [recommendedRoles, setRecommendedRoles] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Skill Management
    const addSkill = (e) => {
        e.preventDefault();
        if (newSkill.trim() && !skills.includes(newSkill.trim())) {
            setSkills([...skills, newSkill.trim()]);
            setNewSkill("");
        }
    };
    const removeSkill = (skill) => {
        setSkills(skills.filter(s => s !== skill));
    };

    // Submit Search
    const handleSearch = async () => {
        if (!role || !apiKey) {
            alert("Please enter Job Role and SerpAPI Key.");
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post(endpoints.confirmSkills, {
                profile_id: profile.profile_id,
                raw_text: profile.raw_text,
                confirmed_skills: skills
            });

            const searchRes = await api.post(endpoints.searchJobs, {
                profile_id: profile.profile_id,
                query: role,
                location: location,
                portals: ["linkedin", "indeed", "glassdoor", "google", "naukri"],
                serp_api_config: { api_key: apiKey, num_jobs: 20 }
            });

            if (searchRes.task_id) {
                setProfile(prev => ({ ...prev, name: prev.name, skills: skills, confirmed_skills: skills }));
                setJobSearch({ taskId: searchRes.task_id, query: role });
                navigate('/dashboard');
            } else {
                alert("Failed to start search task.");
            }

        } catch (err) {
            console.error(err);
            alert("Search failed. Check console.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!profile) return null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-body pb-20 transition-colors duration-500">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">

                {/* Header Section */}
                <header className="mb-16 text-center animate-fade-in-up">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-6 border border-indigo-100 dark:border-indigo-800">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Verification Phase
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                        Refine Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Professional DNA</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">
                        We've identified <span className="text-indigo-600 dark:text-indigo-400 font-black">{skills.length} core competencies</span>. <br className="hidden md:block" />
                        Verify them or add missing ones for ultra-precise job matching.
                    </p>
                </header>

                <div className="grid lg:grid-cols-12 gap-10">

                    {/* Left: Skills & Verification */}
                    <div className="lg:col-span-8 space-y-8 animate-fade-in-up [animation-delay:100ms]">
                        <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/60 dark:border-slate-800 relative overflow-hidden">

                            {/* Decorative Background Icon */}
                            <Zap className="absolute -top-10 -right-10 h-40 w-40 text-indigo-500 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />

                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Target className="h-4 w-4 text-indigo-600" />
                                    Skills Inventory
                                </h2>
                                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-700 uppercase">
                                    {skills.length} Extracted
                                </div>
                            </div>

                            {/* Tags Grid */}
                            <div className="flex flex-wrap gap-2.5 mb-10 min-h-[160px] content-start">
                                {skills.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center w-full py-12 text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                                        <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                                        <p className="text-xs font-black uppercase tracking-widest">Repository Empty</p>
                                    </div>
                                ) : (
                                    skills.map((skill, index) => (
                                        <div
                                            key={skill}
                                            className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-tight border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-default animate-fade-in"
                                            style={{ animationDelay: `${index * 20}ms` }}
                                        >
                                            {skill}
                                            <button
                                                onClick={() => removeSkill(skill)}
                                                className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Input Area */}
                            <form onSubmit={addSkill} className="relative max-w-md">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Plus className="h-5 w-5" />
                                </div>
                                <input
                                    type="text"
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    placeholder="Add manual competence (e.g. AWS, React)..."
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all font-bold text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                />
                                <button
                                    type="submit"
                                    disabled={!newSkill}
                                    className="absolute right-2.5 top-2 bottom-2 px-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all disabled:opacity-0 disabled:scale-90"
                                >
                                    Insert
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right: Engine Configuration */}
                    <div className="lg:col-span-4 space-y-8 animate-fade-in-up [animation-delay:200ms]">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/60 dark:border-slate-800 lg:sticky lg:top-24">
                            <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-indigo-600" />
                                Targeting Config
                            </h2>

                            <div className="space-y-6">
                                {/* Role Selection */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Primary Objective</label>
                                        <button
                                            onClick={() => setShowRoleModal(true)}
                                            className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 uppercase tracking-widest"
                                        >
                                            <Sparkles className="h-3 w-3" /> Use AI Advisor
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Search className="h-4.5 w-4.5" />
                                        </div>
                                        <input
                                            type="text"
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            placeholder="e.g. Senior Frontend Dev"
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Location (Read Only / India focused) */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block">Region</label>
                                    <div className="relative group grayscale">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <MapPin className="h-4.5 w-4.5" />
                                        </div>
                                        <input
                                            type="text"
                                            value={location}
                                            disabled
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-sm text-slate-400 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {/* SerpAPI Key */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">SerpAPI Credentials</label>
                                        <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener noreferrer" className="text-[9px] text-slate-400 hover:text-indigo-600">
                                            <HelpCircle className="h-3.5 w-3.5" />
                                        </a>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Key className="h-4.5 w-4.5" />
                                        </div>
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="Enter SerpAPI private key..."
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-all font-bold text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button
                                        onClick={handleSearch}
                                        disabled={isSubmitting || !role || !apiKey}
                                        className="w-full py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-indigo-600/20 hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:-translate-y-1 transition-all active:translate-y-0 active:shadow-inner disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Optimizing Engine...
                                            </>
                                        ) : (
                                            <>
                                                Initiate Market Scan
                                                <ArrowRight className="h-4 w-4 mb-0.5" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* AI Advisor Modal */}
            {showRoleModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in transition-all">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-3xl max-w-xl w-full p-10 border border-slate-100 dark:border-slate-800 animate-scale-in">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 tracking-tight leading-none">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                    <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                AI Role Advisor
                            </h2>
                            <button onClick={() => setShowRoleModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                                <X className="h-6 w-6 text-slate-400" />
                            </button>
                        </div>

                        {/* Groq Key */}
                        <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Groq Intelligence Key</label>
                                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 font-bold hover:underline">GET FREE KEY &rarr;</a>
                            </div>
                            <input
                                type="password"
                                value={localApiKey}
                                onChange={(e) => setLocalApiKey(e.target.value)}
                                placeholder="gsk_..."
                                className="w-full px-4 py-3 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                            />
                        </div>

                        <div className="mb-8">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block text-center">Your Aspirations</label>
                            <textarea
                                rows="3"
                                value={aiRoleQuery}
                                onChange={(e) => setAiRoleQuery(e.target.value)}
                                placeholder="I want to leverage my Python skills for Al/Big Data roles in high-growth startups..."
                                className="w-full p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 transition-all text-sm font-medium leading-relaxed"
                            ></textarea>
                        </div>

                        {loadingRoles ? (
                            <div className="flex flex-col items-center py-10 gap-4">
                                <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                                <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-[0.2em] animate-pulse">Running Neural Simulation...</p>
                            </div>
                        ) : recommendedRoles.length > 0 ? (
                            <div className="space-y-4 mb-8 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {recommendedRoles.map((r, i) => (
                                    <div
                                        key={i}
                                        onClick={() => { setRole(r.title); setShowRoleModal(false); }}
                                        className="group p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer transition-all"
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <h4 className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{r.title}</h4>
                                            <div className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full uppercase tracking-tighter">Match</div>
                                        </div>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{r.reason}</p>
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        <button
                            onClick={async () => {
                                if (!localApiKey) return alert("Please enter a Groq API Key");
                                if (!aiRoleQuery) return alert("Describe your interests first");
                                setLoadingRoles(true);
                                try {
                                    const res = await api.post(endpoints.suggestRoles, {
                                        api_key: localApiKey,
                                        provider: "groq",
                                        resume_text: profile.raw_text,
                                        user_query: aiRoleQuery
                                    });
                                    setRecommendedRoles(res.roles);
                                } catch (e) {
                                    alert("AI Analysis Error: " + (e.response?.data?.detail || e.message));
                                } finally {
                                    setLoadingRoles(false);
                                }
                            }}
                            disabled={loadingRoles}
                            className={`w-full py-4 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl ${recommendedRoles.length > 0 ? 'bg-slate-900 dark:bg-indigo-800' : 'bg-indigo-600 shadow-indigo-500/20'}`}
                        >
                            {loadingRoles ? 'Thinking...' : recommendedRoles.length > 0 ? 'Re-Generate Advice' : 'Synthesize Suggestions'}
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
