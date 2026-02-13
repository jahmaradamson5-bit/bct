import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-sm shadow-lg">
        <p className="text-xs text-gray-500">{payload[0].payload.time}</p>
        <p className="text-sm font-bold" style={{ color: payload[0].value >= 0 ? '#10B981' : '#EF4444' }}>
          PNL: {payload[0].value >= 0 ? '+' : ''}${payload[0].value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

export default function PnLChart({ data }) {
  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center text-gray-400 text-sm">
        No PNL data available
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={safeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 11, fill: '#6B7280' }}
            stroke="#D1D5DB"
          />
          <YAxis 
            tick={{ fontSize: 11, fill: '#6B7280' }}
            stroke="#D1D5DB"
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="pnl" 
            stroke="#10B981" 
            strokeWidth={2}
            fill="url(#colorPnl)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
