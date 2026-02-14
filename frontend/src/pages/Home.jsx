import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileText, BarChart3, TestTube2, AlertCircle, Loader2 } from 'lucide-react';
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

        // Validate PDF
        if (file.type !== 'application/pdf') {
            setError("Please upload a PDF file.");
            return;
        }

        // Reset states
        setLoading(true);
        setError("");
        setStatus("Uploading resume...");

        try {
            // Simulate UX steps for better engagement
            const timer1 = setTimeout(() => setStatus("Analyzing document structure..."), 1000);
            const timer2 = setTimeout(() => setStatus("Extracting professional skills..."), 2500);

            const formData = new FormData();
            formData.append('file', file);

            // Call API
            const response = await api.post(endpoints.uploadResume, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            console.log("Upload success:", response);

            // Store in context
            setProfile(response);

            setStatus("Success! Redirecting...");

            // Wait slightly
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
        <div className="min-h-screen bg-slate-50 font-body relative">
            <Navbar />

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in transition-all">
                    <div className="p-4 bg-indigo-50 rounded-full mb-6">
                        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                    </div>
                    <h2 className="text-3xl font-display font-bold text-slate-900 mb-2">Processing Resume</h2>
                    <p className="text-slate-500 text-lg animate-pulse">{status}</p>
                </div>
            )}

            <main className={`transition-opacity duration-500 ${loading ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                {/* Hero Section */}
                <section className="pt-24 pb-20 px-4 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold uppercase tracking-wider mb-8 border border-indigo-100 animate-fade-in-up">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        AI-Powered Career Navigator
                    </div>

                    <h1 className="text-5xl md:text-6xl font-display font-bold text-slate-900 mb-6 tracking-tight leading-tight">
                        Find Your Perfect Career Fit <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                            with AI Precision
                        </span>
                    </h1>

                    <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed">
                        Upload your resume, verify your skills, and let our AI simulate your career path.
                        Real-time market analytics at your fingertips.
                    </p>

                    {/* Upload CTA */}
                    <div
                        className={`max-w-xl mx-auto bg-white p-10 rounded-2xl shadow-xl border-2 border-dashed transition-all duration-300 cursor-pointer group relative ${isDragOver ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' : 'border-slate-200 hover:border-indigo-300 hover:shadow-2xl'
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

                        <div className="flex flex-col items-center gap-5">
                            <div className={`p-5 rounded-full transition-colors duration-300 ${isDragOver ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                }`}>
                                <UploadCloud className="h-10 w-10" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-xl font-semibold text-slate-900">Upload your Resume</h3>
                                <p className="text-slate-500 text-sm">PDF formats supported (Max 5MB)</p>
                            </div>
                            <button className="mt-4 px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95">
                                Select File
                            </button>
                        </div>

                        {error && (
                            <div className="absolute -bottom-16 left-0 right-0 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 flex items-center justify-center gap-2 animate-shake">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                        <AlertCircle className="h-3 w-3" />
                        <span>Your data is processed locally and securely.</span>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-20 bg-white border-t border-slate-100">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid md:grid-cols-3 gap-8">
                            <FeatureCard
                                icon={<FileText className="h-6 w-6 text-violet-600" />}
                                title="Smart Parsing"
                                desc="Extracts verified skills from your resume automatically using NLP models."
                                color="bg-violet-50"
                            />
                            <FeatureCard
                                icon={<BarChart3 className="h-6 w-6 text-blue-600" />}
                                title="Market Analytics"
                                desc="Get real-time insights on top skills, salary trends, and locations."
                                color="bg-blue-50"
                            />
                            <FeatureCard
                                icon={<TestTube2 className="h-6 w-6 text-emerald-600" />}
                                title="Skill Simulator"
                                desc="See how learning a new skill (e.g. Kubernetes) impacts your job reach instantly."
                                color="bg-emerald-50"
                            />
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}

function FeatureCard({ icon, title, desc, color }) {
    return (
        <div className="p-8 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300 group">
            <div className={`w-14 h-14 flex items-center justify-center rounded-xl mb-6 ${color} group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-3 font-display">{title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
        </div>
    );
}
