import { useState, useEffect, useRef } from 'react';
import {
    BookOpen,
    FileText,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    ArrowRightLeft,
    BrainCircuit,
    Zap,
    Loader2,
    Copy,
    Check,
    Upload,
    ChevronLeft,
    ChevronRight,
    X
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import api from '../services/api';

export default function ComparisonPage() {
    const [resumeData, setResumeData] = useState({
        profile_id: null,
        resume_url: null,
        raw_text: ""
    });
    const [jdText, setJdText] = useState("");
    const [apiKey, setApiKey] = useState(localStorage.getItem('groq_api_key') || "");
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [copiedIndex, setCopiedIndex] = useState(null);
    const fileInputRef = useRef(null);

    // Save API Key
    useEffect(() => {
        if (apiKey) localStorage.setItem('groq_api_key', apiKey);
    }, [apiKey]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setError("");
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Reusing existing upload endpoint
            const res = await api.post('/profile/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // We get a profile_id and resume_path
            setResumeData({
                profile_id: res.profile_id,
                resume_url: res.resume_path,
                raw_text: res.raw_text
            });
        } catch (err) {
            setError("Failed to upload resume. Please try a valid PDF.");
        } finally {
            setUploading(false);
        }
    };

    const handleCompare = async () => {
        if (!resumeData.profile_id && !resumeData.raw_text) {
            setError("Please upload your Resume first.");
            return;
        }
        if (!jdText.trim()) {
            setError("Please paste a Job Description first.");
            return;
        }
        if (!apiKey.trim()) {
            setError("Please provide your Groq API Key.");
            return;
        }

        setLoading(true);
        setError("");
        try {
            const res = await api.post('/jobs/compare', {
                profile_id: resumeData.profile_id,
                resume_text: resumeData.raw_text,
                jd_text: jdText,
                api_key: apiKey
            });
            setResult(res);
        } catch (err) {
            setError(err.response?.data?.detail || "Comparison failed. Check your API key.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const fullResumeUrl = resumeData.resume_url ? `http://localhost:8000${resumeData.resume_url}` : null;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-body transition-colors duration-300">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">

                <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
                    <div className="text-center md:text-left animate-fade-in-up">
                        <h1 className="text-3xl md:text-4xl font-display font-black tracking-tight mb-1">
                            Deep-Dive <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Comparison</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 max-w-lg text-sm">
                            Ultra-accurate semantic matching between your resume and any job description.
                        </p>
                    </div>

                    <div className="w-full md:w-64 animate-fade-in-up delay-100">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1.5 ml-1 tracking-widest">Groq Engine Key</label>
                        <div className="relative group">
                            <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-yellow-500 transition-colors" />
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="gsk_..."
                                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-mono shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {!result ? (
                    /* Setup View */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up delay-200">
                        {/* Left: Resume Upload/Preview */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[550px] relative">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                                <h3 className="font-bold flex items-center gap-2">
                                    <BookOpen className="h-5 w-5 text-indigo-500" />
                                    Resume Protocol
                                </h3>
                                {resumeData.resume_url && (
                                    <button
                                        onClick={() => setResumeData({ profile_id: null, resume_url: null, raw_text: "" })}
                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 relative flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950/40">
                                {fullResumeUrl ? (
                                    <embed src={fullResumeUrl} type="application/pdf" className="w-full h-full rounded-xl shadow-inner border border-slate-200 dark:border-slate-800" />
                                ) : (
                                    <div className="text-center group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <div className="mb-6 p-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-[2rem] text-indigo-600 dark:text-indigo-400 inline-block group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border-2 border-dashed border-indigo-200 dark:border-indigo-800">
                                            {uploading ? <Loader2 className="h-12 w-12 animate-spin" /> : <Upload className="h-12 w-12" />}
                                        </div>
                                        <h4 className="text-xl font-bold mb-2">Upload Your PDF</h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[240px] mx-auto leading-relaxed">
                                            Select your master resume for the deep-dive matching process.
                                        </p>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
                            </div>
                        </div>

                        {/* Right: JD Input */}
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[550px] group focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all duration-300">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                                <h3 className="font-bold flex items-center gap-2 group-focus-within:text-indigo-600 transition-colors">
                                    <FileText className="h-5 w-5 text-indigo-500" />
                                    Target Job Description
                                </h3>
                                <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Active Input Zone</div>
                            </div>
                            <div className="flex-1 p-6">
                                <textarea
                                    value={jdText}
                                    onChange={(e) => setJdText(e.target.value)}
                                    placeholder="Paste the full job description text here..."
                                    className="w-full h-full p-6 bg-slate-50 dark:bg-slate-800/40 border-none outline-none resize-none font-sans text-base leading-relaxed rounded-3xl dark:text-slate-100 placeholder:text-slate-400 transition-all focus:bg-white dark:focus:bg-slate-800 shadow-inner"
                                />
                            </div>
                            <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                                {error && (
                                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-bold animate-slide-up">
                                        <AlertCircle className="h-5 w-5" />
                                        {error}
                                    </div>
                                )}
                                <button
                                    onClick={handleCompare}
                                    disabled={loading || uploading}
                                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-[1.5rem] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 dark:shadow-none transition-all active:scale-[0.98] group"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                            Initializing Neural Match...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-6 w-6 text-yellow-300 group-hover:rotate-12 transition-transform" />
                                            Generate Match Analytics
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Advanced Results View */
                    <div className="space-y-12 animate-fade-in-up">

                        {/* Compact Score Block */}
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="w-full lg:w-72 bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
                                <div className="relative z-10 flex flex-col items-center justify-center h-full text-center py-2">
                                    <div className="text-white/70 text-[9px] font-black uppercase tracking-[0.2em] mb-2">Neural Confidence</div>
                                    <div className="text-6xl font-black mb-2 tracking-tighter tabular-nums drop-shadow-lg">
                                        {Math.round(result.cross_encoder_score || result.match_score || result.score || 0)}<span className="text-2xl opacity-50 font-display">%</span>
                                    </div>
                                    <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[8px] font-bold uppercase tracking-widest border border-white/20">
                                        Verified Accuracy
                                    </div>
                                </div>
                                <BrainCircuit className="absolute -right-4 -bottom-4 h-32 w-32 text-white/5 group-hover:scale-110 transition-transform duration-1000 rotate-12" />
                            </div>

                            <div className="flex-1 bg-white dark:bg-slate-900 p-6 shadow-md rounded-[2rem] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-6">
                                <div className="h-14 w-14 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                    <Zap className="h-6 w-6 fill-indigo-600" />
                                </div>
                                <div className="text-center md:text-left">
                                    <h2 className="text-xl font-display font-black mb-1">Match Analytics Finished</h2>
                                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm max-w-xl">
                                        Cross-Encoder validated semantic dependencies between your experience and the job mandates.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setResult(null)}
                                    className="md:ml-auto px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 flex items-center gap-1.5"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" /> Start New
                                </button>
                            </div>
                        </div>

                        {/* Analysis Grid */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                            {/* Positive/Negative Cards */}
                            <div className="space-y-8">
                                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/40 rounded-[1.5rem] p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/60 rounded-xl text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-lg font-display font-black text-emerald-900 dark:text-emerald-200">The Power Alignment</h3>
                                    </div>
                                    <p className="text-emerald-800/80 dark:text-emerald-300 text-sm font-medium italic leading-relaxed">
                                        "{result.llm_analysis.why_it_fits}"
                                    </p>
                                </div>

                                <div className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/40 rounded-[1.5rem] p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-orange-100 dark:bg-orange-900/60 rounded-xl text-orange-600 dark:text-orange-400">
                                            <AlertCircle className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-lg font-display font-black text-orange-900 dark:text-orange-200">The Strategic Gaps</h3>
                                    </div>
                                    <p className="text-orange-800/80 dark:text-orange-300 text-sm font-medium italic leading-relaxed">
                                        "{result.llm_analysis.why_it_doesnt_fit}"
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] p-6 shadow-lg flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                                            <Sparkles className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-lg font-display font-black text-slate-900 dark:text-white">Neural Resume Patches</h3>
                                    </div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full">Pro Expert Tips</span>
                                </div>

                                <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar max-h-[400px]">
                                    {result.llm_analysis.resume_patches.map((patch, idx) => (
                                        <div key={idx} className="group bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border-l-4 border-indigo-600 rounded-r-2xl p-4 transition-all duration-200">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <p className="text-slate-800 dark:text-indigo-50 text-sm font-bold leading-relaxed mb-2">
                                                        {patch.bullet_point}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 opacity-60">
                                                        <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                                                        <span className="text-[9px] text-slate-500 dark:text-indigo-300 font-bold uppercase tracking-wider">{patch.reason}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleCopy(patch.bullet_point, idx)}
                                                    className="p-2.5 bg-white dark:bg-slate-700/50 hover:bg-indigo-600 hover:text-white rounded-lg transition-all shadow-sm active:scale-90 text-slate-400"
                                                    title="Copy Patch"
                                                >
                                                    {copiedIndex === idx ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
}
