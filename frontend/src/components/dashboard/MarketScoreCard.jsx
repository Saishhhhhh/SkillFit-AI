import React from 'react';
import { Info } from 'lucide-react';

export default function MarketScoreCard({ score }) {
    const numericScore = Math.round(score || 0);

    const getRecommendation = (s) => {
        if (s >= 90) return "Exceptional fit! You're ready for top-tier roles.";
        if (s >= 80) return "Excellent profile. Very strong market alignment.";
        if (s >= 70) return "Great match. You qualify for most positions.";
        if (s >= 60) return "Good foundation. A few skills will boost you up.";
        if (s >= 50) return "Solid start. Targeted upskilling recommended.";
        if (s >= 40) return "Fair match. Focus on core requirements.";
        if (s >= 30) return "Early stage. Build your portfolio projects.";
        if (s >= 20) return "Learning curve ahead. Don't give up!";
        if (s >= 10) return "Just starting. Every expert was once a beginner.";
        return "New journey. Let's build your skills from scratch.";
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center hover:shadow-md transition-all group relative h-full">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Market Score</h3>
                <div className="invisible group-hover:visible absolute top-0 right-0 -translate-y-full mb-2 p-2 bg-slate-800 dark:bg-slate-900 text-white text-[10px] rounded-lg shadow-xl z-30 w-40 animate-slide-up">
                    Based on skills (60%) and resume text (40%) across all jobs.
                </div>
                <Info className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 transition-colors cursor-help" />
            </div>

            <div className="relative w-48 h-48 flex items-center justify-center group mb-4">
                <svg className="w-full h-full transform -rotate-90 drop-shadow-lg">
                    {/* Background Circle */}
                    <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="none" className="text-slate-100 dark:text-slate-700" />
                    {/* Progress Circle */}
                    <circle
                        cx="96"
                        cy="96"
                        r="80"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray="502"
                        strokeDashoffset={502 - (502 * numericScore / 100)}
                        className="text-indigo-600 dark:text-indigo-400 transition-all duration-1000 ease-out group-hover:text-indigo-500 dark:group-hover:text-indigo-300"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-slate-900 dark:text-white count-up tracking-tighter">{numericScore}</span>
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">out of 100</span>
                </div>
            </div>

            <p className="mt-2 text-slate-600 dark:text-slate-400 px-4 text-sm font-medium leading-relaxed max-w-xs">
                {getRecommendation(numericScore)}
            </p>
        </div>
    );
}
