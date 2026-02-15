import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, Briefcase } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { useApp } from '../context/AppContext';
import api, { endpoints } from '../services/api';

// Modular Components
import MarketScoreCard from '../components/dashboard/MarketScoreCard';
import ResumePreviewPanel from '../components/dashboard/ResumePreviewPanel';
import SkillHeatmap from '../components/dashboard/SkillHeatmap';
import SkillSimulator from '../components/dashboard/SkillSimulator';
import VerifiedSkills from '../components/dashboard/VerifiedSkills';
import LocationChart from '../components/dashboard/LocationChart';
import WorkModeChart from '../components/dashboard/WorkModeChart';
import GrowthEngine from '../components/dashboard/GrowthEngine';
import CareerSafetyNet from '../components/dashboard/CareerSafetyNet';

export default function Dashboard() {
    const { jobSearch, setJobSearch, profile } = useApp();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("Initializing search...");
    const [jobs, setJobs] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [error, setError] = useState("");
    const [logs, setLogs] = useState([]); // Kept for logic compatibility

    useEffect(() => {
        if (!jobSearch?.taskId) {
            navigate('/');
            return;
        }

        let interval;

        const checkStatus = async () => {
            try {
                const res = await api.get(endpoints.getStatus(jobSearch.taskId));

                if (res.status === 'completed') {
                    clearInterval(interval);
                    setStatus("Analyzing results...");

                    try {
                        const [results, analyticsRes] = await Promise.all([
                            api.get(endpoints.getResults(jobSearch.taskId)),
                            api.get(endpoints.getAnalytics(jobSearch.taskId)).catch(() => null)
                        ]);

                        if (!jobSearch.query && results.query) {
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
                    if (res.logs && res.logs.length > 0) {
                        const scanLogs = [...res.logs].reverse();
                        const jobLog = scanLogs.find(l => l.includes(' @ ') && (l.includes('(') || l.includes('Scraping')));

                        if (jobLog) {
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

        checkStatus();
        interval = setInterval(checkStatus, 3000);
        return () => clearInterval(interval);
    }, [jobSearch, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-body transition-colors">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-lg mb-6 animate-bounce border border-slate-100 dark:border-slate-700">
                        <Loader2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Finding Your Perfect Matches</h2>
                    <p className="text-slate-500 dark:text-slate-400 animate-pulse">{status}</p>
                    <div className="mt-8 w-64 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-8">
                        <div className="h-full bg-indigo-600 dark:bg-indigo-500 animate-progress"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors">
                <Navbar />
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Something went wrong</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
                    <button onClick={() => navigate('/resume-review')} className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg">Try Again</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-body pb-20 transition-colors duration-300">
            <Navbar />

            <main className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <header className="mb-8 animate-fade-in-up flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-1">Market Intelligence</h1>
                        <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-sm">
                            Analysis for <span className="font-bold text-slate-700 dark:text-slate-300">{jobSearch?.query || "Target Role"}</span>
                            <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                            Targeting {jobs.length} relevant opportunities.
                        </p>
                    </div>
                </header>

                {/* Main Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 animate-fade-in-up delay-100">

                    {/* LEFT COLUMN: Resume & Skills (Persistent Sidebar) */}
                    <div className="lg:col-span-4 xl:col-span-3 space-y-6">
                        <div className="sticky top-24 space-y-6">
                            <div className="h-[500px] lg:h-[600px]">
                                <ResumePreviewPanel profile={profile} />
                            </div>
                            <VerifiedSkills skills={profile?.confirmed_skills} />
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Metrics & Analytics */}
                    <div className="lg:col-span-8 xl:col-span-9 space-y-6">

                        {/* 1. Market Score Overlay */}
                        <div className="w-full">
                            <MarketScoreCard score={analytics?.avg_match_score || 0} />
                        </div>

                        {/* 2. Heatmap & Simulator Row */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                            <div className="xl:col-span-2 h-96 shadow-sm">
                                <SkillHeatmap analytics={analytics} jobs={jobs} profile={profile} />
                            </div>
                            <div className="xl:col-span-1 min-h-[24rem]">
                                <SkillSimulator jobSearch={jobSearch} profile={profile} />
                            </div>
                        </div>

                        {/* 3. Charts Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="min-h-[22rem]">
                                <LocationChart data={analytics?.top_locations} />
                            </div>
                            <div className="min-h-[22rem]">
                                <WorkModeChart data={analytics?.work_mode_distribution} />
                            </div>
                        </div>

                        {/* 4. Growth & Safety Net Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <GrowthEngine analytics={analytics} profile={profile} />
                            <CareerSafetyNet profile={profile} />
                        </div>

                        {/* 5. Jobs CTA */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 flex flex-col items-center justify-center text-center mt-4 group cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all" onClick={() => navigate('/jobs')}>
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                                <Briefcase className="h-8 w-8" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Ready to explore opportunities?</h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">
                                We found {jobs.length} jobs that match your profile. Filter by skills, location, and more.
                            </p>
                            <button className="inline-flex items-center gap-2 px-8 py-3 bg-slate-900 dark:bg-indigo-600 text-white font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-lg shadow-slate-200 dark:shadow-none hover:shadow-xl">
                                View All Matches
                                <Briefcase className="h-4 w-4" />
                            </button>
                        </div>

                    </div>
                </div>

            </main>
        </div>
    );
}
