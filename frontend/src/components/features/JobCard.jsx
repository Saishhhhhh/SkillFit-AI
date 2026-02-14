
import React, { useMemo } from 'react';
import { Briefcase, MapPin, ExternalLink, CheckCircle, AlertCircle, Building2 } from 'lucide-react';

export default function JobCard({ job, userSkills = [] }) {
    const {
        title,
        company,
        location,
        skills = [],
        match_score = 0,
        link,
        description
    } = job;

    // Determine Match Color
    const matchColor = match_score >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : match_score >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200'
            : 'bg-red-100 text-red-700 border-red-200';

    const scoreLabel = match_score >= 80 ? 'High Match'
        : match_score >= 50 ? 'Potential Match'
            : 'Low Match';

    // Skill Intersection
    const { matched, missing } = useMemo(() => {
        const userSkillSet = new Set(userSkills.map(s => s.toLowerCase()));

        const m = [];
        const x = [];

        skills.forEach(skill => {
            if (userSkillSet.has(skill.toLowerCase())) {
                m.push(skill);
            } else {
                x.push(skill);
            }
        });

        // If no skills overlap (e.g. slight variance), maybe use fuzzy logic?
        // For now, strict string match.
        return { matched: m, missing: x };
    }, [skills, userSkills]);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all group relative overflow-hidden">
            {/* Match Badge */}
            <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold uppercase rounded-bl-xl border-l border-b ${matchColor}`}>
                {Math.round(match_score)}% Match
            </div>

            <div className="mb-4 pr-12">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{title}</h3>
                <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">{company}</span>
                    <span className="mx-1">•</span>
                    <MapPin className="h-4 w-4" />
                    <span>{location}</span>
                </div>
            </div>

            {/* Skills */}
            <div className="mb-4">
                <div className="flex flex-wrap gap-2 text-xs">
                    {matched.slice(0, 5).map((skill, i) => (
                        <span key={`match-${i}`} className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md flex items-center gap-1 font-medium">
                            <CheckCircle className="h-3 w-3" />
                            {skill}
                        </span>
                    ))}
                    {missing.slice(0, 3).map((skill, i) => (
                        <span key={`miss-${i}`} className="px-2 py-1 bg-slate-50 text-slate-500 border border-dashed border-slate-300 rounded-md flex items-center gap-1">
                            {skill}
                        </span>
                    ))}
                    {(matched.length + missing.length) > 8 && (
                        <span className="px-2 py-1 text-slate-400 text-xs">+{skills.length - 8} more</span>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                <div className="text-xs text-slate-500">
                    Posted recently via {job.portal || 'Web'}
                </div>
                <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                >
                    Apply Now
                    <ExternalLink className="h-3 w-3" />
                </a>
            </div>
        </div>
    );
}
