'use client';

import { useEffect, useState } from 'react';
import type { DroughtSummary } from '@/lib/drought';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  None: { label: 'None', color: 'bg-green-500' },
  D0: { label: 'D0 Abnormally Dry', color: 'bg-yellow-500' },
  D1: { label: 'D1+ Moderate', color: 'bg-orange-500' },
  D2: { label: 'D2+ Severe', color: 'bg-red-500' },
  D3: { label: 'D3+ Extreme', color: 'bg-red-700' },
  D4: { label: 'D4 Exceptional', color: 'bg-purple-700' },
};

export default function DroughtCard() {
  const [drought, setDrought] = useState<DroughtSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Call USDM directly from browser — CORS: * confirmed, avoids CF edge IP block
        const today = new Date();
        const ago = new Date(today);
        ago.setDate(today.getDate() - 30);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        const url = `https://usdmdataservices.unl.edu/api/StateStatistics/GetDroughtSeverityStatisticsByAreaPercent?aoi=17&startdate=${fmt(ago)}&enddate=${fmt(today)}&statisticsType=1`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) { setDrought(null); return; }
        const rows = await res.json() as any[];
        if (!Array.isArray(rows) || rows.length === 0) { setDrought(null); return; }
        // API returns newest record first OR last depending on date range — use last entry
        const latest = rows[rows.length - 1];
        const none = latest.none ?? latest.None ?? 0;
        const d0   = latest.d0   ?? latest.D0   ?? 0;
        const d1   = latest.d1   ?? latest.D1   ?? 0;
        const d2   = latest.d2   ?? latest.D2   ?? 0;
        const d3   = latest.d3   ?? latest.D3   ?? 0;
        const d4   = latest.d4   ?? latest.D4   ?? 0;
        const worst = d4 > 0 ? 'D4' : d3 > 0 ? 'D3' : d2 > 0 ? 'D2' : d1 > 0 ? 'D1' : d0 > 0 ? 'D0' : 'None';
        setDrought({
          mapDate: latest.mapDate ?? latest.MapDate ?? latest.validStart ?? fmt(today),
          none, d0, d1, d2, d3, d4,
          inDrought: d1 + d2 + d3 + d4,
          worstCategory: worst,
        });
      } catch {
        setDrought(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-900/90 backdrop-blur rounded-lg p-3 border border-gray-700">
        <div className="flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          <span className="text-xs text-gray-400">Loading drought...</span>
        </div>
      </div>
    );
  }

  // Hide card entirely if no data
  if (!drought) return null;

  const statusInfo = STATUS_CONFIG[drought.worstCategory] ?? STATUS_CONFIG.None;

  if (!expanded) {
    return (
      <div
        className="bg-gray-900/90 backdrop-blur rounded-lg p-3 border border-gray-700 cursor-pointer hover:bg-gray-800/90 transition-colors w-[220px]"
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">🌵</span>
            <span className="text-xs text-gray-300 font-medium">IL Drought:</span>
          </div>
          <span className={`${statusInfo.color} text-white text-xs font-semibold px-2 py-0.5 rounded`}>
            {statusInfo.label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/90 backdrop-blur rounded-lg p-4 border border-gray-700 w-[280px]">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Illinois Drought Status</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            As of {new Date(drought.mapDate).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={() => setExpanded(false)}
          className="text-gray-400 hover:text-white text-lg leading-none flex-shrink-0"
          aria-label="Collapse"
        >
          ×
        </button>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">None</span>
          <span className="text-white font-mono">{drought.none.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">D0 – Abnormally Dry</span>
          <span className="text-white font-mono">{drought.d0.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">D1 – Moderate</span>
          <span className="text-white font-mono">{drought.d1.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">D2 – Severe</span>
          <span className="text-white font-mono">{drought.d2.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">D3 – Extreme</span>
          <span className="text-white font-mono">{drought.d3.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">D4 – Exceptional</span>
          <span className="text-white font-mono">{drought.d4.toFixed(1)}%</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          US Drought Monitor – NDMC / USDA / NOAA
        </p>
        <a
          href="https://www.drought.gov/states/illinois"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-flex items-center gap-1"
        >
          drought.gov/states/illinois ↗
        </a>
      </div>
    </div>
  );
}
