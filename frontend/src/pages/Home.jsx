import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, BarChart3, TestTube2, AlertCircle, Loader2, Target, Zap, ShieldCheck, ArrowRight } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import api, { endpoints } from '../services/api';
import { useApp } from '../context/AppContext';

export default function Home() {
    const { setProfile } = useApp();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [isDragOver, setIsDragOver] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [error, setError] = useState("");

    const handleFileUpload = async (file) => {
        if (!file) return;

        if (file.type !== 'application/pdf') {
            setError("Please upload a PDF file.");
            return;
        }

        setLoading(true);
        setError("");
        setStatus("Uploading resume...");

        try {
            const timer1 = setTimeout(() => setStatus("Analyzing document structure..."), 1000);
            const timer2 = setTimeout(() => setStatus("Extracting professional skills..."), 2500);

            const formData = new FormData();
            formData.append('file', file);

            const response = await api.post(endpoints.uploadResume, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            setProfile(response);
            setStatus("Success! Redirecting...");

            setTimeout(() => {
                navigate('/resume-review');
            }, 500);

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to process resume. Is the backend running?");
            setLoading(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };
    const handleDragLeave = () => setIsDragOver(false);

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        handleFileUpload(file);
    };

    const onFileChange = (e) => {
        const file = e.target.files[0];
        handleFileUpload(file);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-body relative selection:bg-indigo-100 dark:selection:bg-indigo-900/40 transition-colors duration-500">
            <Navbar />

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl z-[60] flex flex-col items-center justify-center animate-fade-in transition-all">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-all duration-500 animate-pulse"></div>
                        <div className="p-8 bg-white dark:bg-slate-900 rounded-full shadow-2xl relative border border-slate-100 dark:border-slate-800 mb-8">
                            <Loader2 className="h-12 w-12 text-indigo-600 dark:text-indigo-400 animate-spin" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-3">Processing Your Future</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-lg font-medium animate-pulse">{status}</p>

                    <div className="mt-8 w-64 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 animate-progress"></div>
                    </div>
                </div>
            )}

            <main className={`pt-20 px-4 transition-all duration-700 ${loading ? 'opacity-20 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>

                {/* Decorative Elements */}
                <div className="absolute top-20 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

                {/* Hero Section */}
                <section className="max-w-7xl mx-auto py-16 md:py-24 text-center">
                    <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white dark:bg-slate-900 shadow-sm border border-slate-200/50 dark:border-slate-800 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest mb-10 animate-fade-in-up">
                        <Zap className="h-3.5 w-3.5 fill-current" />
                        AI-Powered Career Intelligence
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-black text-slate-900 dark:text-white mb-8 tracking-tight leading-[1.1] animate-fade-in-up [animation-delay:100ms]">
                        Find Your Perfect <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 animate-gradient-x">
                            Career Alignment
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-16 leading-relaxed font-medium animate-fade-in-up [animation-delay:200ms]">
                        Upload your resume once and unlock real-time market data, skill gap analysis, and tailored learning paths powered by Groq Intelligence.
                    </p>

                    {/* Upload Section */}
                    <div className="max-w-3xl mx-auto mb-24 animate-fade-in-up [animation-delay:300ms]">
                        <div
                            className={`relative bg-white dark:bg-slate-900 p-2 rounded-3xl shadow-2xl transition-all duration-500 ${isDragOver ? 'ring-4 ring-indigo-500/20 scale-[1.01]' : ''
                                }`}
                        >
                            <div
                                className={`p-10 md:p-16 rounded-[1.25rem] border-2 border-dashed transition-all duration-300 cursor-pointer group flex flex-col items-center gap-8 ${isDragOver
                                    ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10'
                                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50'
                                    }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={onDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".pdf"
                                    onChange={onFileChange}
                                />

                                <div className="relative">
                                    <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-2xl group-hover:bg-indigo-500/40 transition-all duration-500 scale-150"></div>
                                    <div className={`w-20 h-20 flex items-center justify-center rounded-2xl shadow-xl transition-all duration-500 relative ${isDragOver ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'
                                        }`}>
                                        <UploadCloud className="h-10 w-10" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Drop your resume here</h3>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">Click to browse or drag and drop (PDF only, max 5MB)</p>
                                </div>

                                <button className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 hover:bg-slate-900 dark:hover:bg-indigo-500 transition-all transform hover:-translate-y-1 active:translate-y-0 active:shadow-inner flex items-center gap-3">
                                    Start Analysis
                                    <ArrowRight className="h-5 w-5" />
                                </button>
                            </div>

                            {error && (
                                <div className="absolute -bottom-20 left-4 right-4 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm font-bold rounded-2xl border border-red-100 dark:border-red-900/50 flex items-center justify-center gap-2 animate-shake">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Trust Indicators */}
                    <div className="flex flex-wrap items-center justify-center gap-10 md:gap-20 opacity-50 dark:opacity-40 animate-fade-in [animation-delay:500ms]">
                        <div className="flex items-center gap-2 font-black tracking-tighter text-slate-900 dark:text-white text-xl">
                            <ShieldCheck className="h-6 w-6 text-indigo-600" /> PRIVACY FIRST
                        </div>
                        <div className="flex items-center gap-2 font-black tracking-tighter text-slate-900 dark:text-white text-xl uppercase">
                            <Target className="h-6 w-6 text-indigo-600" /> Precision Matching
                        </div>
                        <div className="flex items-center gap-2 font-black tracking-tighter text-slate-900 dark:text-white text-xl uppercase">
                            <Zap className="h-6 w-6 text-indigo-600" /> Real-time Data
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-24 border-t border-slate-200/50 dark:border-slate-800/50">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-20 animate-fade-in">
                            <h2 className="text-3xl md:text-5xl font-display font-black text-slate-900 dark:text-white mb-6">Engineered for your success</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto">Our multi-model AI pipeline analyzes the market 24/7 to keep you ahead of the competition.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <FeatureCard
                                icon={<FileText className="h-6 w-6" />}
                                title="Smart NLP Parsing"
                                desc="Our bespoke models extract nested skills, experience depth, and project impact from your resume with 99% accuracy."
                                color="bg-indigo-600"
                            />
                            <FeatureCard
                                icon={<BarChart3 className="h-6 w-6" />}
                                title="Live Market Pulse"
                                desc="Aggregated insights from LinkedIn, Indeed, Glassdoor, Google Jobs and Naukri. See trending locations, salary brackets, and work-mode shifts."
                                color="bg-violet-600"
                            />
                            <FeatureCard
                                icon={<TestTube2 className="h-6 w-6" />}
                                title="Impact Simulator"
                                desc="Ever wondered how 'AWS' or 'React' would change your profile reach? Simulate any skill addition instantly."
                                color="bg-emerald-600"
                            />
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="py-12 border-t border-slate-200/50 dark:border-slate-800/50 text-center">
                <p className="text-slate-400 dark:text-slate-600 text-sm font-medium">© 2026 SkillFit AI. Built with ❤️ By Saish</p>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc, color }) {
    return (
        <div className="p-10 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 hover:border-indigo-500/30 dark:hover:border-indigo-400/30 hover:shadow-2xl hover:shadow-indigo-500/5 dark:hover:shadow-none transition-all duration-500 group relative overflow-hidden">
            <div className={`w-14 h-14 flex items-center justify-center rounded-2xl mb-8 text-white shadow-lg ${color} group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                {icon}
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">{title}</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed">{desc}</p>

            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent w-full scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
        </div>
    );
}
