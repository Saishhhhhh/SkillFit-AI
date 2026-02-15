import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, ExternalLink, X } from 'lucide-react';

export default function ResumePreviewPanel({ profile, className = "" }) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Lock scroll when expanded
    useEffect(() => {
        if (isExpanded) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isExpanded]);

    if (!profile) return null;

    const resumeUrl = profile.resume_path || profile.resume_url;
    const fullUrl = resumeUrl ? `http://localhost:8000${resumeUrl}` : null;

    const Content = ({ expanded = false }) => (
        <div className={`flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden ${expanded ? 'h-[90vh] w-[95vw] md:w-[80vw] shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700' : 'h-full relative group'}`}>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <BookOpen className="h-4 w-4 text-indigo-500" />
                    Resume Preview {expanded && "(Expanded)"}
                </h3>

                <div className="flex items-center gap-2">
                    {fullUrl && (
                        <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                            title="Open in New Tab"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    )}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                        title={expanded ? "Collapse" : "Expand View"}
                    >
                        {expanded ? <X className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            <div className={`flex-1 bg-slate-100 dark:bg-slate-900 overflow-hidden relative ${!expanded && 'min-h-[400px]'}`}>
                {fullUrl ? (
                    <embed
                        src={fullUrl}
                        type="application/pdf"
                        className="w-full h-full border-none"
                    />
                ) : (
                    <div className="p-6 overflow-y-auto h-full bg-white dark:bg-slate-800 font-serif text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {profile.raw_text || "No resume text available."}
                    </div>
                )}

                {!expanded && (
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white dark:from-slate-800 to-transparent pointer-events-none flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-xs font-bold text-slate-400 bg-white/80 dark:bg-slate-900/80 px-3 py-1 rounded-full shadow-sm backdrop-blur-sm">Click expand for full view</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* Inline Preview */}
            <div className={`h-full ${className}`}>
                <Content expanded={false} />
            </div>

            {/* Portal for Expanded View */}
            {isExpanded && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
                        onClick={() => setIsExpanded(false)}
                    />
                    <div className="relative animate-scale-up">
                        <Content expanded={true} />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
