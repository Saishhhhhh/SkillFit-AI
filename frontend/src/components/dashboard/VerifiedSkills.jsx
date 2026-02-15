import React from 'react';
import { Target } from 'lucide-react';

export default function VerifiedSkills({ skills, className = "" }) {
    if (!skills || skills.length === 0) return null;

    return (
        <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 ${className}`}>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-500" />
                Verified Skills
            </h3>
            <div className="flex flex-wrap gap-2">
                {skills.map(skill => (
                    <span
                        key={skill}
                        className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-xs font-bold rounded-full border border-indigo-100 dark:border-indigo-800 transition-all hover:scale-105 cursor-default"
                    >
                        {skill}
                    </span>
                ))}
            </div>
            {skills.length > 8 && (
                <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 italic">
                    + {skills.length - 8} more skills not shown
                </p>
            )}
        </div>
    );
}
