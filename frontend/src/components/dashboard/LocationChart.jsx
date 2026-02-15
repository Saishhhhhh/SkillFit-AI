import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { MapPin } from 'lucide-react';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function LocationChart({ data }) {
    if (!data || data.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow h-full">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-500" />
                Top Locations
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data.slice(0, 5)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="count"
                        >
                            {data.slice(0, 5).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#64748b' }}
                            wrapperStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
                            formatter={(value) => <span className="text-slate-500 dark:text-slate-400">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
