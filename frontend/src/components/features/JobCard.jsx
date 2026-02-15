import React, { useMemo } from 'react';
import { Briefcase, MapPin, ExternalLink, CheckCircle, AlertCircle, Building2, Zap, ArrowRight, Gauge } from 'lucide-react';

export default function JobCard({ job, userSkills = [] }) {
    const {
        title,
        company,
        location,
        skills = [],
        match_score = 0,
        link,
        description,
        portal
    } = job;

    // Determine Match Color
    const isHighMatch = match_score >= 80;
    const isMidMatch = match_score >= 50;

    const matchGradient = isHighMatch
        ? 'from-emerald-500 to-teal-600 shadow-emerald-500/20'
        : isMidMatch
            ? 'from-amber-500 to-orange-600 shadow-amber-500/20'
            : 'from-slate-500 to-slate-700 shadow-slate-500/20';

    // Skill Intersection
    const { matched, missing } = useMemo(() => {
        const userSkillSet = new Set(userSkills.map(s => s.toLowerCase()));
        const m = [];
        const x = [];

        const skillArray = Array.isArray(skills) ? skills : [];

        skillArray.forEach(skill => {
            if (userSkillSet.has(skill.toLowerCase())) {
                m.push(skill);
            } else {
                x.push(skill);
            }
        });

        return { matched: m, missing: x };
    }, [skills, userSkills]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/60 dark:border-slate-800 p-6 hover:shadow-[0_20px_50px_rgba(79,70,229,0.1)] dark:hover:shadow-none dark:hover:border-indigo-500/50 transition-all duration-500 group relative overflow-hidden animate-fade-in-up">

            {/* Background Glow */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${matchGradient.split(' ')[0]} opacity-[0.03] rounded-full blur-2xl -mr-16 -mt-16 group-hover:opacity-[0.08] transition-opacity`}></div>

            <div className="flex flex-col md:flex-row gap-6 relative z-10">

                {/* Score Circular Indicator */}
                <div className="flex-shrink-0 flex items-center justify-center">
                    <div className="relative w-20 h-20">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="6" fill="none" className="text-slate-100 dark:text-slate-800" />
                            <circle
                                cx="40"
                                cy="40"
                                r="34"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="none"
                                strokeDasharray="213.6"
                                strokeDashoffset={213.6 - (213.6 * match_score / 100)}
                                className={`${isHighMatch ? 'text-emerald-500' : isMidMatch ? 'text-amber-500' : 'text-slate-400'} transition-all duration-1000`}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-slate-900 dark:text-white leading-none">{Math.round(match_score)}%</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight leading-tight">
                                {title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400 text-xs font-bold mt-2 uppercase tracking-wider">
                                <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                                    <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                                    {company}
                                </span>
                                <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                                    {location}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${isHighMatch ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' :
                                    isMidMatch ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800' :
                                        'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-700'
                                }`}>
                                {isHighMatch ? 'Optimal Match' : isMidMatch ? 'Strong Potential' : 'Lower Match'}
                            </div>
                        </div>
                    </div>

                    {/* Skills Summary */}
                    <div className="mb-6">
                        <div className="flex flex-wrap gap-2">
                            {matched.slice(0, 4).map((skill, i) => (
                                <div key={`match-${i}`} className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border-2 border-emerald-100 dark:border-emerald-900/30 rounded-xl transition-all hover:scale-105">
                                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                                    <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">{skill}</span>
                                </div>
                            ))}
                            {missing.slice(0, 3).map((skill, i) => (
                                <div key={`miss-${i}`} className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl grayscale opacity-60">
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tight">{skill}</span>
                                </div>
                            ))}
                            {(matched.length + missing.length) > 7 && (
                                <span className="flex items-center px-3 py-1 text-[10px] font-black text-slate-400 dark:text-slate-600 bg-transparent border border-transparent rounded-xl">
                                    +{(Array.isArray(skills) ? skills.length : 0) - 7} more
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 mt-auto">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                <Zap className="h-4 w-4 text-indigo-500" />
                            </div>
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
                                Via <span className="text-indigo-600 dark:text-indigo-400">{portal || 'Market Scraper'}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => window.open(link, '_blank')}
                                className="group flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:shadow-xl dark:hover:shadow-indigo-500/20 transition-all active:scale-95"
                            >
                                Apply Now
                                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
