'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { SparklinePoint } from '@/lib/types';

interface Props {
  data: SparklinePoint[];
}

export default function Sparkline({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12, borderRadius: 6 }}
          labelStyle={{ color: '#94a3b8' }}
          itemStyle={{ color: '#60a5fa' }}
          formatter={(val) => [`${Number(val).toFixed(2)} ft`, 'Gage Height']}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#60a5fa' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
