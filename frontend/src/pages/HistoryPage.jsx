import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import api, { endpoints } from '../services/api';
import Navbar from '../components/layout/Navbar';
import { Clock, FileText, Search, ChevronRight, Briefcase, Trash2, Calendar, Target, ExternalLink, AlertCircle } from 'lucide-react';

export default function HistoryPage() {
    const { setProfile, setJobSearch } = useApp();
    const navigate = useNavigate();

    const [profiles, setProfiles] = useState([]);
    const [selectedProfileId, setSelectedProfileId] = useState(null);
    const [searches, setSearches] = useState([]);
    const [loadingProfiles, setLoadingProfiles] = useState(true);
    const [loadingSearches, setLoadingSearches] = useState(false);

    useEffect(() => {
        const fetchProfiles = async () => {
            try {
                const res = await api.get(endpoints.getHistoryProfiles);
                setProfiles(res || []);
            } catch (error) {
                console.error("Failed to load history", error);
            } finally {
                setLoadingProfiles(false);
            }
        };
        fetchProfiles();
    }, []);

    useEffect(() => {
        if (!selectedProfileId) {
            setSearches([]);
            return;
        }

        const fetchSearches = async () => {
            setLoadingSearches(true);
            try {
                const res = await api.get(endpoints.getProfileSearches(selectedProfileId));
                setSearches(res || []);
            } catch (error) {
                console.error("Failed to load searches", error);
            } finally {
                setLoadingSearches(false);
            }
        };
        fetchSearches();
    }, [selectedProfileId]);

    const handleRestoreSearch = (search, profile) => {
        setProfile({
            profile_id: profile.id,
            raw_text: profile.raw_text,
            confirmed_skills: profile.confirmed_skills || [],
            resume_path: profile.resume_path,
        });

        setJobSearch({
            taskId: search.id,
        });

        navigate('/dashboard');
    };

    const handleDeleteProfile = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Delete this resume and all its history?")) return;
        try {
            await api.delete(endpoints.deleteProfile(id));
            setProfiles(prev => prev.filter(p => p.id !== id));
            if (selectedProfileId === id) {
                setSelectedProfileId(null);
                setSearches([]);
            }
        } catch (err) { console.error("Deleted failed", err); }
    };

    const handleDeleteSearch = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm("Delete this search?")) return;
        try {
            await api.delete(endpoints.deleteSearch(id));
            setSearches(prev => prev.filter(s => s.id !== id));
        } catch (err) { console.error("Delete failed", err); }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-body pb-20 transition-colors duration-500">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">

                {/* Header Section */}
                <header className="mb-12 animate-fade-in-up">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4 border border-indigo-100 dark:border-indigo-800">
                                <Clock className="h-3 w-3" />
                                Activity Log
                            </div>
                            <h1 className="text-4xl md:text-5xl font-display font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                                Your Career <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Timeline</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Review past resumes and market analysis sessions.</p>
                        </div>
                    </div>
                </header>

                <div className="grid lg:grid-cols-12 gap-10">

                    {/* Left: Profiles List (Sidebar Style) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Resumes ({profiles.length})
                            </h2>
                        </div>

                        {loadingProfiles ? (
                            <div className="flex flex-col gap-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse"></div>
                                ))}
                            </div>
                        ) : profiles.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center animate-fade-in">
                                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">No history yet.</p>
                                <button onClick={() => navigate('/')} className="mt-4 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline">UPLOAD RESUME &rarr;</button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {profiles.map((profile, index) => (
                                    <div
                                        key={profile.id}
                                        onClick={() => setSelectedProfileId(profile.id)}
                                        className={`group p-5 rounded-2xl border transition-all duration-300 cursor-pointer animate-fade-in-up [animation-delay:${index * 50}ms] ${selectedProfileId === profile.id
                                                ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500'
                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-xl transition-colors ${selectedProfileId === profile.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-[140px]" title={profile.filename}>
                                                        {profile.filename || "Untitled Resume"}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => handleDeleteProfile(e, profile.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                    title="Delete Resume"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                                {selectedProfileId === profile.id && <ChevronRight className="h-4 w-4 text-indigo-500" />}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5">
                                            {(profile.confirmed_skills || []).slice(0, 4).map(s => (
                                                <span key={s} className="text-[9px] font-black bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md border border-slate-100 dark:border-slate-700">
                                                    {s}
                                                </span>
                                            ))}
                                            {(profile.confirmed_skills?.length || 0) > 4 && (
                                                <span className="text-[9px] font-black text-slate-400 px-1">+{profile.confirmed_skills.length - 4}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Searches List (Content Area) */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Search className="h-4 w-4" />
                                Available Analyses
                            </h2>
                        </div>

                        {!selectedProfileId ? (
                            <div className="bg-white dark:bg-slate-900/50 p-20 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center animate-fade-in-up">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
                                    <FileText className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Select a resume</h3>
                                <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto text-sm leading-relaxed">Choose a resume on the left to review its generated market intelligence reports.</p>
                            </div>
                        ) : loadingSearches ? (
                            <div className="space-y-4">
                                {[1, 2].map(i => (
                                    <div key={i} className="h-40 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 animate-pulse"></div>
                                ))}
                            </div>
                        ) : searches.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 p-16 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 text-center animate-fade-in">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                                    <Search className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">No scans found</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">This resume hasn't been scanned for jobs yet.</p>
                                <button
                                    onClick={() => handleRestoreSearch({ id: null }, profiles.find(p => p.id === selectedProfileId))}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-slate-900 transition-all flex items-center gap-2 mx-auto"
                                >
                                    New Market Scan <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-2 gap-4">
                                {searches.map((search, index) => (
                                    <div
                                        key={search.id}
                                        onClick={() => handleRestoreSearch(search, profiles.find(p => p.id === selectedProfileId))}
                                        className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/5 dark:hover:shadow-none transition-all cursor-pointer group animate-fade-in-up"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <Calendar className="h-3 w-3 text-slate-400" />
                                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    {new Date(search.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteSearch(e, search.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                title="Delete Search"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {search.query}
                                        </h3>

                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">Market Match</div>
                                                <div className="flex items-center gap-1.5">
                                                    <Target className="h-4 w-4 text-emerald-500" />
                                                    <span className="text-xl font-black text-slate-800 dark:text-slate-200">{Math.round(search.average_score)}%</span>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">Found Jobs</div>
                                                <div className="flex items-center gap-1.5">
                                                    <Briefcase className="h-4 w-4 text-indigo-500" />
                                                    <span className="text-xl font-black text-slate-800 dark:text-slate-200">{search.total_jobs || 0}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex -space-x-2">
                                                {search.portals?.map((p, i) => (
                                                    <div key={p} className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-900 flex items-center justify-center text-[8px] font-black text-slate-400 uppercase tracking-tighter" title={p}>
                                                        {p.charAt(0)}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest group-hover:gap-2 transition-all">
                                                Restore <ExternalLink className="h-3 w-3" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
