import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, Briefcase, MapPin, TrendingUp, AlertCircle, Sparkles, Target, Info, BookOpen, Map, ArrowRight, CheckCircle } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { useApp } from '../context/AppContext';
import api, { endpoints } from '../services/api';
import SimulatorModal from '../components/features/SimulatorModal';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Dashboard() {
    const { jobSearch, setJobSearch, profile } = useApp();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("Initializing search...");
    const [logs, setLogs] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [error, setError] = useState("");

    // Simulator State (Integrated)
    const [simSkill, setSimSkill] = useState("");
    const [simResult, setSimResult] = useState(null);
    const [simLoading, setSimLoading] = useState(false);

    // GenAI State
    // Roadmap
    const [roadmap, setRoadmap] = useState(null);
    const [loadingRoadmap, setLoadingRoadmap] = useState(false);
    const [roadmapApiKey, setRoadmapApiKey] = useState("");



    // Pivots
    const [pivots, setPivots] = useState(null);
    const [loadingPivots, setLoadingPivots] = useState(false);
    const [pivotsApiKey, setPivotsApiKey] = useState("");

    // Resume Modal
    const [showResume, setShowResume] = useState(false);


    useEffect(() => {
        if (!jobSearch?.taskId) {
            navigate('/');
            return;
        }

        let interval;

        const checkStatus = async () => {
            try {
                // Poll status using dedicated endpoint
                const res = await api.get(endpoints.getStatus(jobSearch.taskId));

                if (res.status === 'completed') {
                    clearInterval(interval);
                    setStatus("Analyzing results...");

                    // Fetch Final Data
                    try {
                        const [results, analyticsRes] = await Promise.all([
                            api.get(endpoints.getResults(jobSearch.taskId)),
                            api.get(endpoints.getAnalytics(jobSearch.taskId)).catch(() => null)
                        ]);

                        // Persist or recover query (Role)
                        if (!jobSearch.query && results.query) {
                            // Force update context to persist for session
                            setJobSearch(prev => ({ ...prev, query: results.query }));
                        }

                        setJobs(results.jobs || []);
                        setAnalytics(analyticsRes);
                    } catch (e) {
                        console.warn("Fetch results failed", e);
                    }

                    setLoading(false);
                } else if (res.status === 'failed') {
                    clearInterval(interval);
                    setError("Search failed. Please try again.");
                    setLoading(false);
                } else {
                    // Filter logs for the display status
                    if (res.logs && res.logs.length > 0) {
                        const scanLogs = [...res.logs].reverse();
                        const jobLog = scanLogs.find(l => l.includes(' @ ') && (l.includes('(') || l.includes('Scraping')));

                        if (jobLog) {
                            // Remove (1/10) patterns
                            const cleaner = jobLog.replace(/\(\d+\/\d+\)/, '').trim();
                            setStatus(cleaner);
                        } else {
                            setStatus("Scanning market portals...");
                        }
                        setLogs(res.logs);
                    } else {
                        setStatus("Connecting to scrapers...");
                    }
                }
            } catch (err) {
                console.error("Polling error", err);
                // If 404, the task might be from a past session (deleted from memory but in DB)
                if (err.response?.status === 404) {
                    clearInterval(interval);
                    try {
                        const [results, analyticsRes] = await Promise.all([
                            api.get(endpoints.getResults(jobSearch.taskId)),
                            api.get(endpoints.getAnalytics(jobSearch.taskId)).catch(() => null)
                        ]);
                        if (results?.jobs) {
                            if (!jobSearch.query && results.query) {
                                setJobSearch(prev => ({ ...prev, query: results.query }));
                            }
                            setJobs(results.jobs);
                            setAnalytics(analyticsRes);
                            setLoading(false);
                            return;
                        }
                    } catch (e) {
                        setError("Search not found. It may have expired or been deleted.");
                    }
                    setLoading(false);
                }
            }
        };

        // Initial check
        checkStatus();
        interval = setInterval(checkStatus, 3000); // 3s poll

        return () => clearInterval(interval);
    }, [jobSearch, navigate]);

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

    const heatmapData = (analytics?.top_skills || []).map(skill => {
        const hasSkill = profile?.confirmed_skills?.some(s => s.toLowerCase() === skill.name.toLowerCase());
        return {
            ...skill,
            percentage: jobs.length > 0 ? ((skill.count / jobs.length) * 100).toFixed(1) : "0.0",
            fill: hasSkill ? '#10B981' : '#F87171' // Emerald Green vs Coral Red
        };
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col font-body">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="p-4 bg-white rounded-full shadow-lg mb-6 animate-bounce">
                        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Finding Your Perfect Matches</h2>
                    <p className="text-slate-500 animate-pulse">{status}</p>

                    {/* Simple Progress Indicator */}
                    <div className="mt-8 w-64 h-2 bg-slate-200 rounded-full overflow-hidden mb-8">
                        <div className="h-full bg-indigo-600 animate-progress"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <button onClick={() => navigate('/resume-review')} className="px-6 py-2 bg-slate-900 text-white rounded-lg">Try Again</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-body pb-20">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 py-8">

                <header className="mb-8 animate-fade-in-up flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-slate-900 mb-1">Market Intelligence</h1>
                        <p className="text-slate-500 flex items-center gap-2">
                            Analysis for <span className="font-bold text-slate-700">{jobSearch?.query || "Target Role"}</span>
                            <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                            Based on {jobs.length >= 50 ? '50+' : jobs.length} jobs retrieved.
                        </p>
                    </div>
                    {profile && (
                        <button
                            onClick={() => setShowResume(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                        >
                            <BookOpen className="h-4 w-4" />
                            View Resume
                        </button>
                    )}
                </header>

                {/* Resume Modal */}
                {showResume && profile && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowResume(false)}>
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col animate-scale-up" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-indigo-600" />
                                    Resume Preview
                                </h3>
                                <div className="flex items-center gap-2">
                                    {(profile.resume_path || profile.resume_url) && (
                                        <a
                                            href={`http://localhost:8000${profile.resume_path || profile.resume_url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1 bg-indigo-50 rounded-lg border border-indigo-100 transition-all"
                                        >
                                            Open in New Tab
                                        </a>
                                    )}
                                    <button onClick={() => setShowResume(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                        <span className="sr-only">Close</span>
                                        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden bg-slate-100">
                                {profile.resume_path || profile.resume_url ? (
                                    <embed
                                        src={`http://localhost:8000${profile.resume_path || profile.resume_url}`}
                                        type="application/pdf"
                                        className="w-full h-full border-none"
                                    />
                                ) : (
                                    <div className="p-8 overflow-y-auto h-full bg-white font-serif text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                                        {profile.raw_text}
                                    </div>
                                )}
                            </div>
                            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                                <button onClick={() => setShowResume(false)} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800">Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dashboard Grid */}
                <div className="grid lg:grid-cols-3 gap-6 mb-8 animate-fade-in-up delay-100">

                    {/* Score Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow group relative">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Total Market Score</h3>
                            <div className="invisible group-hover:visible absolute top-0 right-0 -translate-y-full mb-2 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl z-30 w-40 animate-slide-up">
                                Based on skills (60%) and resume text (40%) across all jobs.
                            </div>
                            <Info className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors cursor-help" />
                        </div>
                        <div className="relative w-40 h-40 flex items-center justify-center group">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="80" cy="80" r="70" stroke="#E2E8F0" strokeWidth="12" fill="none" />
                                <circle cx="80" cy="80" r="70" stroke="#4F46E5" strokeWidth="12" fill="none" strokeDasharray="440" strokeDashoffset={440 - (440 * (analytics?.avg_match_score || 0) / 100)} className="transition-all duration-1000 ease-out group-hover:stroke-indigo-500" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-bold text-slate-900 count-up">{Math.round(analytics?.avg_match_score || 0)}</span>
                                <span className="text-xs text-slate-500">out of 100</span>
                            </div>
                        </div>
                        <p className="mt-4 text-slate-600 px-4 text-sm font-medium">
                            {(() => {
                                const s = Math.round(analytics?.avg_match_score || 0);
                                if (s >= 90) return "Exceptional fit! You're ready for top-tier roles.";
                                if (s >= 80) return "Excellent profile. Very strong market alignment.";
                                if (s >= 70) return "Great match. You qualify for most positions.";
                                if (s >= 60) return "Good foundation. A few skills will boost you up.";
                                if (s >= 50) return "Solid start. Targeted upskilling recommended.";
                                if (s >= 40) return "Fair match. Focus on core requirements.";
                                if (s >= 30) return "Early stage. Build your portfolio projects.";
                                if (s >= 20) return "Learning curve ahead. Don't give up!";
                                if (s >= 10) return "Just starting. Every expert was once a beginner.";
                                return "New journey. Let's build your skills from scratch.";
                            })()}
                        </p>
                    </div>

                    {/* Skill Demand Heatmap */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-indigo-500" />
                                    Skill Demand Heatmap
                                </h3>
                                <span className="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                                    <Info className="h-3 w-3" /> Hover bars to explore
                                </span>
                            </div>
                            <div className="flex gap-4 text-xs font-medium">
                                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-500"></span> You Have</span>
                                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-400"></span> Missing</span>
                            </div>
                        </div>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <BarChart data={heatmapData.slice(0, 12)} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-45} textAnchor="end" height={60} />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                                    <Tooltip
                                        cursor={{ fill: '#f1f5f9' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-white p-3 shadow-xl rounded-lg border border-slate-100">
                                                        <p className="font-bold text-slate-900">{payload[0].payload.name}</p>
                                                        <p className="text-sm text-slate-500">{payload[0].payload.percentage}% of jobs require this</p>
                                                        <p className={`text-xs mt-1 font-bold ${payload[0].payload.fill === '#10B981' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {payload[0].payload.fill === '#10B981' ? '✓ You have this skill' : '× Skill missing'}
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="percentage" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Integrated Simulator & User Skills */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Simulation Tool */}
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white">
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                Skill Simulator
                            </h3>
                            <p className="text-indigo-100 text-sm mb-4">See your market value jump by adding a new skill.</p>

                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={simSkill}
                                    onChange={(e) => setSimSkill(e.target.value)}
                                    placeholder="e.g. Docker, AWS..."
                                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-indigo-200 outline-none focus:bg-white/20 transition-all"
                                />
                                <button
                                    onClick={handleSimulation}
                                    disabled={simLoading || !simSkill}
                                    className="w-full py-2.5 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all disabled:opacity-50"
                                >
                                    {simLoading ? 'Analysing...' : 'Simulate Growth'}
                                </button>
                            </div>

                            {simResult && !simResult.error && (
                                <div className="mt-4 pt-4 border-t border-white/10 animate-fade-in space-y-3">
                                    <div className="bg-white/10 p-4 rounded-xl border border-white/10 group cursor-help relative">
                                        <div className="text-[10px] text-indigo-100 uppercase tracking-widest font-black mb-1 opacity-80">Projected Market Reach</div>
                                        <div className="flex items-end gap-2">
                                            <span className="text-4xl font-black">{Math.round(simResult.new_reach || 0)}%</span>
                                        </div>
                                        <div className="invisible group-hover:visible absolute bottom-full left-0 mb-2 p-3 bg-slate-800 text-white text-[10px] rounded-xl shadow-2xl z-30 w-48 leading-relaxed animate-slide-up">
                                            Percentage of jobs where you meet the &gt;70% match threshold after learning this skill.
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-xs text-indigo-100 font-bold uppercase tracking-wider">New Avg. Market Score</span>
                                        <span className="text-base font-black">{(simResult.new_avg_score || 0).toFixed(1)}%</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Your Skills */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <Target className="h-5 w-5 text-indigo-500" />
                                Your Verified Skills
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {(profile?.confirmed_skills || []).map(skill => (
                                    <span key={skill} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full border border-indigo-100">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Location Chart */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1 hover:shadow-md transition-shadow">
                        <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-blue-500" />
                            Top Locations
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <PieChart>
                                    <Pie
                                        data={(analytics?.top_locations || []).slice(0, 5)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="count"
                                    >
                                        {(analytics?.top_locations || []).slice(0, 5).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Work Mode Chart */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1 hover:shadow-md transition-shadow">
                        <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-purple-500" />
                            Work Mode
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                <PieChart>
                                    <Pie
                                        data={analytics?.work_mode_distribution || []}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="count"
                                    >
                                        {(analytics?.work_mode_distribution || []).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* GenAI Section: Growth Engine & Pivots */}
                <div className="grid lg:grid-cols-2 gap-6 mb-12 animate-fade-in-up delay-200">

                    {/* 1. Growth Engine (Roadmap) */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                <Map className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Personalized Growth Engine</h3>
                                <p className="text-sm text-slate-500">Your AI-generated path to {analytics?.top_skills?.[0]?.name || 'Target Role'} mastery.</p>
                            </div>
                        </div>

                        {!roadmap ? (
                            <div className="text-center py-6">
                                <p className="text-slate-600 mb-4 max-w-sm mx-auto text-sm">
                                    Generate a 3-month accelerated learning plan based on your skill gaps.
                                </p>

                                {/* Embedded Config */}
                                <div className="mb-4 max-w-xs mx-auto bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-xs text-slate-500">Enter your Groq API Key</p>
                                        <a href="https://www.youtube.com/watch?v=nt1PJu47nTk" target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 hover:text-indigo-800 underline">Get Key</a>
                                    </div>
                                    <input
                                        type="password"
                                        value={roadmapApiKey}
                                        onChange={(e) => setRoadmapApiKey(e.target.value)}
                                        placeholder="gsk_..."
                                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-500 text-center"
                                    />
                                </div>

                                <button
                                    onClick={async () => {
                                        if (!roadmapApiKey) return alert("Please enter an API Key to generate roadmap.");

                                        setLoadingRoadmap(true);
                                        try {
                                            const missing = (analytics?.top_skills || [])
                                                .filter(s => !profile?.confirmed_skills?.some(cs => cs.toLowerCase() === s.name.toLowerCase()))
                                                .slice(0, 5) // Top 5 missing skills
                                                .map(s => s.name);

                                            if (missing.length === 0) {
                                                alert("You have all top skills! Great job.");
                                                setLoadingRoadmap(false);
                                                return;
                                            }

                                            const res = await api.post(endpoints.generateRoadmap, {
                                                api_key: roadmapApiKey,
                                                provider: "groq",
                                                current_role: "Aspiring Candidate", // Could be from profile
                                                target_role: "Target Role", // Could be dynamic
                                                missing_skills: missing
                                            });
                                            setRoadmap(res);
                                        } catch (e) {
                                            alert("Roadmap Error: " + (e.response?.data?.detail || e.message));
                                        } finally {
                                            setLoadingRoadmap(false);
                                        }
                                    }}
                                    disabled={loadingRoadmap}
                                    className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-70 text-sm"
                                >
                                    {loadingRoadmap ? (
                                        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Building Plan...</span>
                                    ) : (
                                        <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Generate 3-Month Roadmap</span>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200">
                                    {roadmap.monthly_plan.map((month, i) => (
                                        <div key={i} className="min-w-[200px] flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                            <div className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">Month {month.month}</div>
                                            <h4 className="font-bold text-slate-800 mb-2">{month.focus_topic}</h4>
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {month.skills_to_learn.slice(0, 3).map(s => (
                                                    <span key={s} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">{s}</span>
                                                ))}
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-2 italic">"{month.project_idea}"</p>
                                        </div>
                                    ))}
                                </div>


                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        <Target className="h-4 w-4 text-emerald-500" />
                                        Portfolio Killer Projects
                                    </h4>
                                    <div className="space-y-3">
                                        {roadmap.portfolio_projects.map((proj, i) => (
                                            <div key={i} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                                                <h5 className="font-bold text-slate-800 text-sm mb-1">{proj.title}</h5>
                                                <p className="text-xs text-slate-600 mb-2">{proj.description}</p>
                                                <div className="flex items-start gap-1.5">
                                                    <div className="mt-0.5"><CheckCircle className="h-3 w-3 text-emerald-600" /></div>
                                                    <p className="text-[10px] text-emerald-700 font-medium">Recruiter Hook: {proj.recruiter_hook}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. The Pivoter (Safety Net) */}
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                                <ArrowRight className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Career Safety Net</h3>
                                <p className="text-sm text-slate-500">Explore adjacent roles you can pivot to with minimal effort.</p>
                            </div>
                        </div>

                        {!pivots ? (
                            <div className="text-center py-6">
                                <p className="text-slate-600 mb-4 max-w-sm mx-auto text-sm">
                                    Find 3 roles with &gt;70% skill overlap to your current profile.
                                </p>

                                {/* Embedded Config */}
                                <div className="mb-4 max-w-xs mx-auto bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-xs text-slate-500">Enter your Groq API Key</p>
                                        <a href="https://www.youtube.com/watch?v=nt1PJu47nTk" target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-600 hover:text-purple-800 underline">Get Key</a>
                                    </div>
                                    <input
                                        type="password"
                                        value={pivotsApiKey}
                                        onChange={(e) => setPivotsApiKey(e.target.value)}
                                        placeholder="gsk_..."
                                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-purple-500 text-center"
                                    />
                                </div>

                                <button
                                    onClick={async () => {
                                        if (!pivotsApiKey) return alert("Please enter an API Key to explore pivots.");

                                        setLoadingPivots(true);
                                        try {
                                            const res = await api.post(endpoints.suggestPivot, {
                                                api_key: pivotsApiKey,
                                                provider: "groq",
                                                current_role: "Current Profile",
                                                current_skills: profile?.confirmed_skills || []
                                            });
                                            setPivots(res.pivots);
                                        } catch (e) {
                                            alert("Pivot Error: " + (e.response?.data?.detail || e.message));
                                        } finally {
                                            setLoadingPivots(false);
                                        }
                                    }}
                                    disabled={loadingPivots}
                                    className="px-6 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 disabled:opacity-70 text-sm"
                                >
                                    {loadingPivots ? (
                                        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Analyzing Overlaps...</span>
                                    ) : (
                                        <span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Explore Pivots</span>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                {pivots.map((pivot, i) => (
                                    <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-purple-200 transition-colors shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-900">{pivot.role}</h4>
                                            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                                {pivot.overlap_percentage}% Overlap
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                                            <Briefcase className="h-3 w-3" />
                                            <span>{pivot.salary_potential}</span>
                                        </div>
                                        <div className="bg-purple-50 p-2 rounded-lg">
                                            <span className="text-[10px] uppercase font-bold text-purple-400 block mb-1">Bridge Skills Needed</span>
                                            <div className="flex flex-wrap gap-1">
                                                {pivot.bridge_skills.map(s => (
                                                    <span key={s} className="text-xs font-medium text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-100">{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div >

                {/* Job List */}
                {/* CTA to Jobs Page */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center animate-fade-in-up delay-200 col-span-full">
                    <Briefcase className="h-12 w-12 text-indigo-500 mb-4 bg-indigo-50 p-2 rounded-xl" />
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Ready to explore opportunities?</h3>
                    <p className="text-slate-600 mb-6 max-w-md">
                        We found {jobs.length} jobs that match your profile. Filter by skills, location, and more to find your perfect role.
                    </p>
                    <button
                        onClick={() => navigate('/jobs')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-all hover:scale-105 shadow-lg shadow-slate-200"
                    >
                        View All Matches ({jobs.length})
                        <Briefcase className="h-4 w-4" />
                    </button>
                </div>

                {/* Modals */}
                {/* Simulator Modal is now embedded */}

            </main >
        </div >
    );
}
