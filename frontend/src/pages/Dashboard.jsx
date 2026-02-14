import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, Briefcase, MapPin, TrendingUp, AlertCircle, Sparkles, Target, Info } from 'lucide-react';
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
                    // Update status message from logs if available
                    if (res.logs && res.logs.length > 0) {
                        setStatus(res.logs[res.logs.length - 1]);
                        setLogs(res.logs);
                    } else {
                        setStatus("Scraping in progress...");
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
            percentage: ((skill.count / jobs.length) * 100).toFixed(1),
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

                    <div className="mt-8 w-64 h-2 bg-slate-200 rounded-full overflow-hidden mb-8">
                        <div className="h-full bg-indigo-600 animate-progress"></div>
                    </div>

                    {/* Real-time Logs Terminal */}
                    {logs.length > 0 && (
                        <div className="w-full max-w-2xl bg-slate-900 rounded-xl p-4 shadow-2xl border border-slate-800 font-mono text-xs">
                            <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                                <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
                                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500"></div>
                                <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                                <span className="text-slate-500 ml-2 text-[10px] uppercase tracking-wider">Live Scraper Logs</span>
                            </div>
                            <div className="h-48 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700 pr-2 flex flex-col-reverse">
                                {logs.map((log, i) => (
                                    <div key={i} className="text-slate-300 break-all leading-relaxed">
                                        <span className="text-indigo-500 mr-2 font-bold">›</span>
                                        {log}
                                    </div>
                                )).reverse()}
                            </div>
                        </div>
                    )}
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

                <header className="mb-8 animate-fade-in-up">
                    <h1 className="text-3xl font-display font-bold text-slate-900">Market Intelligence</h1>
                    <p className="text-slate-500">Analysis based on {jobs.length} jobs retrieved.</p>
                </header>

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
                        <p className="mt-4 text-slate-600 px-4 text-sm">
                            You match strongly with top tier jobs in the market. Keep improving!
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

            </main>
        </div>
    );
}
