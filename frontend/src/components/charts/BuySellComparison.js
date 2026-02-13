import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-sm shadow-lg">
        <p className="text-xs font-semibold mb-1">{payload[0].payload.name}</p>
        <p className="text-xs text-green-600">Buy: ${payload[0].value.toFixed(2)}</p>
        <p className="text-xs text-red-600">Sell: ${payload[1].value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

export default function BuySellComparison({ data }) {
  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-gray-400 text-sm">
        No comparison data available
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={safeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 11, fill: '#6B7280' }}
            stroke="#D1D5DB"
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#6B7280' }}
            stroke="#D1D5DB"
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
            iconType="circle"
          />
          <Bar dataKey="buy" fill="#10B981" name="Buy Positions" radius={[4, 4, 0, 0]} />
          <Bar dataKey="sell" fill="#EF4444" name="Sell Positions" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
