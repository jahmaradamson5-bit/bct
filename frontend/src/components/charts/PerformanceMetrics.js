import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';

 dashboard-page-crash
export default function PerformanceMetrics({ metrics = {} }) {

export default function PerformanceMetrics({ metrics }) {
  const safeMetrics = metrics && typeof metrics === 'object' ? metrics : {};
 main
  const { 
    totalValue = 0, 
    totalPnl = 0, 
    winRate = 0, 
    avgReturn = 0,
    totalTrades = 0,
    bestTrade = 0,
    worstTrade = 0
 dashboard-page-crash
  } = metrics || {};

  } = safeMetrics;
 main

  const metricsData = [
    {
      label: 'Total Value',
      value: `$${totalValue.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      label: 'Total PNL',
      value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`,
      icon: totalPnl >= 0 ? TrendingUp : TrendingDown,
      color: totalPnl >= 0 ? 'text-green-600' : 'text-red-600',
      bg: totalPnl >= 0 ? 'bg-green-50' : 'bg-red-50'
    },
    {
      label: 'Win Rate',
      value: `${winRate.toFixed(1)}%`,
      icon: Target,
      color: winRate >= 50 ? 'text-green-600' : 'text-orange-600',
      bg: winRate >= 50 ? 'bg-green-50' : 'bg-orange-50'
    },
    {
      label: 'Avg Return',
      value: `${avgReturn >= 0 ? '+' : ''}${avgReturn.toFixed(2)}%`,
      icon: avgReturn >= 0 ? TrendingUp : TrendingDown,
      color: avgReturn >= 0 ? 'text-green-600' : 'text-red-600',
      bg: avgReturn >= 0 ? 'bg-green-50' : 'bg-red-50'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {metricsData.map((metric, idx) => {
        const Icon = metric.icon;
        return (
          <div key={idx} className={`p-4 rounded-sm border border-gray-200 ${metric.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${metric.color}`} />
              <span className="text-xs text-gray-600 font-medium">{metric.label}</span>
            </div>
            <div className={`text-2xl font-['Manrope'] font-bold ${metric.color}`}>
              {metric.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
