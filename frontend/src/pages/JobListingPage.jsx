
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import api, { endpoints } from '../services/api';
import Navbar from '../components/layout/Navbar';
import JobCard from '../components/features/JobCard';
import { Filter, Search, SortAsc, Briefcase, MapPin, Sliders } from 'lucide-react';

export default function JobListingPage() {
    const { jobSearch, profile } = useApp();
    const navigate = useNavigate();

    const [jobs, setJobs] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [minScore, setMinScore] = useState(0);
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [selectedLocations, setSelectedLocations] = useState([]);
    const [sortBy, setSortBy] = useState('match_score'); // 'match_score' | 'date'

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

        // 1. Score Threshold
        if (minScore > 0) {
            result = result.filter(job => (job.match_score || 0) >= minScore);
        }

        // 2. Skills (Check if job has ANY of the selected skills)
        if (selectedSkills.length > 0) {
            const selectedSet = new Set(selectedSkills.map(s => s.toLowerCase()));
            result = result.filter(job => {
                const jobSkills = job.skills || [];
                if (typeof jobSkills === 'string') return false; // Parse error
                return jobSkills.some(s => selectedSet.has(s.toLowerCase()));
            });
        }

        // 3. Location
        if (selectedLocations.length > 0) {
            const selectedLocSet = new Set(selectedLocations.map(l => l.toLowerCase()));
            result = result.filter(job => {
                // Simple substring check or exact match
                const loc = (job.location || "").toLowerCase();
                return selectedLocSet.has(loc) || [...selectedLocSet].some(sl => loc.includes(sl));
            });
        }

        // Sorting
        if (sortBy === 'match_score') {
            result.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
        } else {
            // Sort by Date (if available) - assuming array order is roughly chronological or scrape order
            // Or if backend provides date
        }

        return result;
    }, [jobs, minScore, selectedSkills, selectedLocations, sortBy]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading jobs...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 font-body pb-20">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Sidebar Filters */}
                    <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-24">
                            <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                Filters
                            </h3>

                            {/* Match Score Slider */}
                            <div className="mb-6">
                                <label className="text-sm font-medium text-slate-700 mb-2 block">
                                    Minimum Match Score: {minScore}%
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={minScore}
                                    onChange={(e) => setMinScore(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>

                            {/* Skills Filter */}
                            <div className="mb-6">
                                <label className="text-sm font-medium text-slate-700 mb-2 block">Skills</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {uniqueSkills.map(skill => (
                                        <label key={skill} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedSkills.includes(skill)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedSkills([...selectedSkills, skill]);
                                                    else setSelectedSkills(selectedSkills.filter(s => s !== skill));
                                                }}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            {skill}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Location Filter */}
                            <div className="mb-6">
                                <label className="text-sm font-medium text-slate-700 mb-2 block">Location</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {uniqueLocations.slice(0, 10).map(loc => (
                                        <label key={loc} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedLocations.includes(loc)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedLocations([...selectedLocations, loc]);
                                                    else setSelectedLocations(selectedLocations.filter(l => l !== loc));
                                                }}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            {loc}
                                        </label>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Job Listings</h1>
                                <p className="text-slate-500">{filteredJobs.length} jobs found based on your profile.</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="match_score">Highest Match Score</option>
                                </select>
                            </div>
                        </header>

                        <div className="grid gap-4">
                            {filteredJobs.length > 0 ? (
                                filteredJobs.map((job, idx) => (
                                    <JobCard key={idx} job={job} userSkills={profile?.confirmed_skills || []} />
                                ))
                            ) : (
                                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                                    <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-slate-900">No jobs found</h3>
                                    <p className="text-slate-500">Try adjusting your filters.</p>
                                </div>
                            )}
                        </div>
                    </main>

                </div>
            </div>
        </div>
    );
}
