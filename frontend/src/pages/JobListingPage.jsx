import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import api, { endpoints } from '../services/api';
import Navbar from '../components/layout/Navbar';
import JobCard from '../components/features/JobCard';
import { Filter, Search, SortAsc, Briefcase, MapPin, Sliders, LayoutGrid, List, AlertCircle, Loader2, ChevronRight, Target } from 'lucide-react';

export default function JobListingPage() {
    const { jobSearch, profile } = useApp();
    const navigate = useNavigate();

    const [jobs, setJobs] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [minScore, setMinScore] = useState(30);
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [selectedLocations, setSelectedLocations] = useState([]);
    const [sortBy, setSortBy] = useState('match_score');

    useEffect(() => {
        if (!jobSearch?.taskId) {
            navigate('/');
            return;
        }

        const fetchData = async () => {
            try {
                const [resultsRes, analyticsRes] = await Promise.all([
                    api.get(endpoints.getResults(jobSearch.taskId)),
                    api.get(endpoints.getAnalytics(jobSearch.taskId))
                ]);

                setJobs(resultsRes.jobs || []);
                setAnalytics(analyticsRes);
            } catch (err) {
                console.error("Failed to fetch jobs", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [jobSearch, navigate]);

    // Derived Filters
    const uniqueSkills = useMemo(() => {
        const skillSet = new Set();
        jobs.forEach(job => {
            let s = job.skills;
            if (typeof s === 'string') {
                try { s = JSON.parse(s); } catch (e) { s = []; }
            }
            if (Array.isArray(s)) {
                s.forEach(skill => skillSet.add(skill));
            }
        });
        return Array.from(skillSet).sort();
    }, [jobs]);

    const uniqueLocations = useMemo(() => analytics?.top_locations?.map(l => l.name) || [], [analytics]);

    // Filtering Logic
    const filteredJobs = useMemo(() => {
        let result = [...jobs];

        if (minScore > 0) {
            result = result.filter(job => (job.match_score || 0) >= minScore);
        }

        if (selectedSkills.length > 0) {
            const selectedSet = new Set(selectedSkills.map(s => s.toLowerCase()));
            result = result.filter(job => {
                const jobSkills = job.skills || [];
                if (typeof jobSkills === 'string') return false;
                return jobSkills.some(s => selectedSet.has(s.toLowerCase()));
            });
        }

        if (selectedLocations.length > 0) {
            const selectedLocSet = new Set(selectedLocations.map(l => l.toLowerCase()));
            result = result.filter(job => {
                const loc = (job.location || "").toLowerCase();
                return selectedLocSet.has(loc) || [...selectedLocSet].some(sl => loc.includes(sl));
            });
        }

        if (sortBy === 'match_score') {
            result.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
        }

        return result;
    }, [jobs, minScore, selectedSkills, selectedLocations, sortBy]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center font-body gap-6">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 animate-bounce">
                    <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Accessing Opportunities...</h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-body pb-20 transition-colors duration-500">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
                <div className="flex flex-col lg:flex-row gap-10">

                    {/* Sidebar Filters */}
                    <aside className="w-full lg:w-72 flex-shrink-0 animate-fade-in-up">
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/60 dark:border-slate-800 sticky top-24">
                            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                <Sliders className="h-4 w-4" />
                                Preference Engine
                            </h3>

                            <div className="space-y-10">
                                {/* Match Score Slider */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-tight">Min Match Score</label>
                                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded-md">{minScore}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={minScore}
                                        onChange={(e) => setMinScore(Number(e.target.value))}
                                        className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-600 transition-all hover:h-2"
                                    />
                                    <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400">
                                        <span>0%</span>
                                        <span>Focus</span>
                                        <span>100%</span>
                                    </div>
                                </div>

                                {/* Skills Grid */}
                                <div>
                                    <label className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-tight mb-4 block">Core Competencies</label>
                                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-3 hide-scrollbar group">
                                        {uniqueSkills.map(skill => (
                                            <label key={skill} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer group/item ${selectedSkills.includes(skill)
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400'
                                                    : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-700 text-slate-600 dark:text-slate-400'
                                                }`}>
                                                <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${selectedSkills.includes(skill) ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                                                    }`}>
                                                    {selectedSkills.includes(skill) && <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={selectedSkills.includes(skill)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedSkills([...selectedSkills, skill]);
                                                        else setSelectedSkills(selectedSkills.filter(s => s !== skill));
                                                    }}
                                                />
                                                <span className="text-xs font-bold leading-none">{skill}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Locations */}
                                <div>
                                    <label className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-tight mb-4 block">Target Locations</label>
                                    <div className="flex flex-wrap gap-2">
                                        {uniqueLocations.slice(0, 10).map(loc => (
                                            <button
                                                key={loc}
                                                onClick={() => {
                                                    if (selectedLocations.includes(loc)) setSelectedLocations(selectedLocations.filter(l => l !== loc));
                                                    else setSelectedLocations([...selectedLocations, loc]);
                                                }}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border uppercase tracking-tight ${selectedLocations.includes(loc)
                                                        ? 'bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600'
                                                        : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                                                    }`}
                                            >
                                                {loc}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => { setMinScore(30); setSelectedSkills([]); setSelectedLocations([]); }}
                                className="w-full mt-10 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-red-500 dark:hover:text-red-400 transition-colors"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 space-y-8">
                        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-2 animate-fade-in-up">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4 border border-indigo-100 dark:border-indigo-800">
                                    <Target className="h-3 w-3" />
                                    Market Analysis Results
                                </div>
                                <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 dark:text-white mb-2 leading-none">
                                    Strategic <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Matches</span>
                                </h1>
                                <p className="text-slate-500 dark:text-slate-400 font-medium">{filteredJobs.length} roles found for <span className="text-slate-900 dark:text-white font-bold">{jobSearch?.query || "Position"}</span></p>
                            </div>

                            <div className="flex items-center gap-3 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 focus:ring-0 cursor-pointer pr-10"
                                >
                                    <option value="match_score text-black">Sort by Compatibility</option>
                                    <option value="date">Sort by Recent (Coming Soon)</option>
                                </select>
                            </div>
                        </header>

                        <div className="grid gap-6">
                            {filteredJobs.length > 0 ? (
                                filteredJobs.map((job, idx) => (
                                    <JobCard key={idx} job={job} userSkills={profile?.confirmed_skills || []} />
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 text-center animate-fade-in">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
                                        <Search className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No matches found</h3>
                                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-sm leading-relaxed mb-8">Try lowering the minimum match score or expanding your target locations.</p>
                                    <button
                                        onClick={() => { setMinScore(0); setSelectedSkills([]); setSelectedLocations([]); }}
                                        className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-600 hover:text-white transition-all"
                                    >
                                        Clear All Filters
                                    </button>
                                </div>
                            )}
                        </div>

                        {filteredJobs.length > 0 && (
                            <div className="py-12 text-center">
                                <p className="text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">YOU'VE REACHED THE END OF YOUR MATCHES</p>
                            </div>
                        )}
                    </main>

                </div>
            </div>
        </div>
    );
}
