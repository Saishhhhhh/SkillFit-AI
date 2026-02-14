
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import api, { endpoints } from '../services/api';
import Navbar from '../components/layout/Navbar';
import { Clock, FileText, Search, ChevronRight, Briefcase, Trash2 } from 'lucide-react';

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
                if (res && res.length > 0) {
                    // Optionally auto-select first profile?
                    // setSelectedProfileId(res[0].id);
                }
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
        // 1. Set Profile Context
        // We need to match the structure expected by AppContext
        setProfile({
            profile_id: profile.id,
            raw_text: profile.raw_text,
            confirmed_skills: profile.confirmed_skills || [],
            // Add other fields if necessary
        });

        // 2. Set Job Search Context
        setJobSearch({
            taskId: search.id,
            // We can fetch results/analytics later in Dashboard
        });

        // 3. Navigate
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
        <div className="min-h-screen bg-slate-50 font-body pb-20">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                    <Clock className="h-8 w-8 text-indigo-600" />
                    History
                </h1>

                <div className="grid lg:grid-cols-12 gap-8">

                    {/* Left: Profiles List */}
                    <div className="lg:col-span-5 space-y-4">
                        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-slate-500" />
                            Resumes
                        </h2>

                        {loadingProfiles ? (
                            <div className="text-slate-500">Loading profiles...</div>
                        ) : profiles.length === 0 ? (
                            <div className="text-slate-500 italic">No history found.</div>
                        ) : (
                            <div className="space-y-3">
                                {profiles.map(profile => (
                                    <div
                                        key={profile.id}
                                        onClick={() => setSelectedProfileId(profile.id)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedProfileId === profile.id
                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200'
                                            : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-semibold text-slate-900 truncate max-w-[200px]" title={profile.filename}>
                                                    {profile.filename || "Untitled Resume"}
                                                </h3>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Uploaded: {new Date(profile.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleDeleteProfile(e, profile.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Resume"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                {selectedProfileId === profile.id && <ChevronRight className="h-5 w-5 text-indigo-500" />}
                                            </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-1">
                                            {(profile.confirmed_skills || []).slice(0, 5).map(s => (
                                                <span key={s} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                                    {s}
                                                </span>
                                            ))}
                                            {(profile.confirmed_skills?.length || 0) > 5 && (
                                                <span className="text-[10px] text-slate-400 px-1">+{profile.confirmed_skills.length - 5}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Searches List */}
                    <div className="lg:col-span-7 space-y-4">
                        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                            <Search className="h-5 w-5 text-slate-500" />
                            Search History
                        </h2>

                        {!selectedProfileId ? (
                            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                                Select a profile to view search history.
                            </div>
                        ) : loadingSearches ? (
                            <div className="text-slate-500">Loading searches...</div>
                        ) : searches.length === 0 ? (
                            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                                No searches found for this profile.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {searches.map(search => (
                                    <div
                                        key={search.id}
                                        onClick={() => handleRestoreSearch(search, profiles.find(p => p.id === selectedProfileId))}
                                        className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group relative"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                {search.query}
                                            </h3>
                                            <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-600">
                                                {new Date(search.created_at).toLocaleDateString()}
                                            </span>

                                            <button
                                                onClick={(e) => handleDeleteSearch(e, search.id)}
                                                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10"
                                                title="Delete Search"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="h-4 w-4" />
                                                {search.total_jobs || 0} Jobs
                                            </span>
                                            {search.average_score > 0 && (
                                                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                                    Avg Score: {Math.round(search.average_score)}%
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2 text-xs">
                                            {search.portals?.map(p => (
                                                <span key={p} className="px-2 py-1 bg-slate-50 text-slate-500 border border-slate-200 rounded uppercase tracking-wider">
                                                    {p}
                                                </span>
                                            ))}
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
