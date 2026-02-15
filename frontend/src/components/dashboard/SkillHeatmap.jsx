import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { TrendingUp, Info } from 'lucide-react';

export default function SkillHeatmap({ analytics, jobs, profile }) {
    if (!analytics || !jobs) return null;

    const heatmapData = (analytics.top_skills || []).map(skill => {
        const hasSkill = profile?.confirmed_skills?.some(s => s.toLowerCase() === skill.name.toLowerCase());
        return {
            ...skill,
            percentage: jobs.length > 0 ? ((skill.count / jobs.length) * 100).toFixed(1) : "0.0",
            fill: hasSkill ? '#10B981' : '#F87171' // Emerald Green vs Coral Red
        };
    });

    if (heatmapData.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow h-full">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-indigo-500" />
                        Skill Demand Heatmap
                    </h3>
                    <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                        <Info className="h-3 w-3" /> Hover bars
                    </span>
                </div>
                <div className="flex gap-4 text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></span> You Have
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <span className="h-3 w-3 rounded-full bg-red-400 shadow-sm shadow-red-200"></span> Missing
                    </span>
                </div>
            </div>

            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={heatmapData.slice(0, 12)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 9, fill: '#94a3b8' }}
                            interval={0}
                            angle={-35}
                            textAnchor="end"
                            height={80}
                            tickLine={false}
                            axisLine={false}
                            padding={{ left: 10, right: 10 }}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            unit="%"
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-white dark:bg-slate-900 p-3 shadow-xl rounded-lg border border-slate-100 dark:border-slate-700">
                                            <p className="font-bold text-slate-900 dark:text-slate-100 mb-1">{data.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{data.percentage}% of jobs require this</p>
                                            <p className={`text-xs mt-2 font-bold flex items-center gap-1 ${data.fill === '#10B981' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                                                {data.fill === '#10B981' ? '✓ Skill Verified' : '× Skill Missing'}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar
                            dataKey="percentage"
                            radius={[4, 4, 0, 0]}
                            barSize={32}
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
