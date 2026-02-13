import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const COLORS = ['#10B981', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-sm shadow-lg">
        <p className="text-sm font-semibold">{payload[0].name}</p>
        <p className="text-xs text-gray-500">Value: ${payload[0].value.toFixed(2)}</p>
        <p className="text-xs text-gray-500">Share: {((payload[0].value / payload[0].payload.total) * 100).toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

export default function PositionDistribution({ data }) {
  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-gray-400 text-sm">
        No position data available
      </div>
    );
  }

  const total = safeData.reduce((sum, item) => sum + (item.value || 0), 0);
  const dataWithTotal = safeData.map(item => ({ ...item, total }));

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={dataWithTotal}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {dataWithTotal.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
