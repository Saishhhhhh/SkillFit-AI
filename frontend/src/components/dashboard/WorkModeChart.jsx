import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Briefcase } from 'lucide-react';

const COLORS = ['#8B5CF6', '#EC4899', '#6366F1', '#3B82F6', '#10B981'];

export default function WorkModeChart({ data }) {
    if (!data || data.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow h-full">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-purple-500" />
                Work Mode
            </h3>
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="count"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontSize: '12px' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            align="center"
                            height={32}
                            iconType="circle"
                            wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '10px' }}
                            formatter={(value) => <span className="text-slate-500 dark:text-slate-400 font-medium">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
