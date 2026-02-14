import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Search, MapPin, Key, HelpCircle, CheckCircle2 } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import { useApp } from '../context/AppContext';
import api, { endpoints } from '../services/api';

export default function ResumeReview() {
    const { profile, setJobSearch } = useApp();
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
            // 1. Confirm Skills (Generate Vectors)
            await api.post(endpoints.confirmSkills, {
                profile_id: profile.profile_id,
                raw_text: profile.raw_text,
                confirmed_skills: skills
            });

            // 2. Start Job Search
            const searchRes = await api.post(endpoints.searchJobs, {
                profile_id: profile.profile_id,
                query: role,
                location: location,
                portals: ["linkedin", "indeed", "glassdoor", "google", "naukri"],
                serp_api_config: { api_key: apiKey, num_jobs: 10 }
            });

            if (searchRes.task_id) {
                setJobSearch({ taskId: searchRes.task_id });
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
        <div className="min-h-screen bg-slate-50 font-body pb-20">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 py-10">

                {/* Header */}
                <div className="mb-10 text-center animate-fade-in-up">
                    <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">
                        Verify Your Skills
                    </h1>
                    <p className="text-slate-600">
                        We extracted <b>{skills.length} skills</b> from your resume. Verify them to ensure accurate matching.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">

                    {/* Left: Skills */}
                    <div className="md:col-span-2 space-y-6 animate-fade-in-up delay-100">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                    Detected Skills
                                </h2>
                                <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-500 font-medium border border-slate-200">
                                    {skills.length} verified
                                </span>
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-6 min-h-[100px] content-start">
                                {skills.length === 0 && (
                                    <p className="text-slate-400 italic text-sm py-4">No skills detected. Add some below!</p>
                                )}
                                {skills.map(skill => (
                                    <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-100 group hover:border-indigo-300 hover:bg-indigo-100 transition-all cursor-default">
                                        {skill}
                                        <button onClick={() => removeSkill(skill)} className="hover:text-red-500 hover:bg-red-50 rounded-full p-0.5 transition-colors">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            {/* Add Skill */}
                            <form onSubmit={addSkill} className="relative group">
                                <input
                                    type="text"
                                    value={newSkill}
                                    onChange={(e) => setNewSkill(e.target.value)}
                                    placeholder="Add a missing skill (e.g. Docker)..."
                                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                />
                                <button
                                    type="submit"
                                    disabled={!newSkill}
                                    className="absolute right-2 top-2 p-1.5 bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-50 transition-all"
                                >
                                    <Plus className="h-5 w-5" />
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right: Job Preferences */}
                    <div className="space-y-6 animate-fade-in-up delay-200">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-slate-800">
                                <Search className="h-5 w-5 text-blue-600" />
                                Job Preferences
                            </h2>

                            <div className="space-y-4">
                                {/* Role */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Target Job Role</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            placeholder="e.g. Data Scientist"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                        <input
                                            type="text"
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            placeholder="e.g. Remote"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                {/* API Key */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-sm font-medium text-slate-700">SerpAPI Key <span className="text-red-500">*</span></label>
                                        <div className="group relative cursor-help">
                                            <HelpCircle className="h-4 w-4 text-slate-400" />
                                            <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg hidden group-hover:block z-10">
                                                Required API key for Google Jobs value.
                                                <div className="absolute bottom-[-4px] right-1 w-2 h-2 bg-slate-800 rotate-45"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <Key className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="Enter SerpAPI Key"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={handleSearch}
                                        disabled={isSubmitting || !role}
                                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Starting Search...
                                            </>
                                        ) : (
                                            <>Find Matching Jobs</>
                                        )}
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
