'use client';

import { useEffect, useState } from 'react';
import type { GageWithStatus, FloodStatus, SparklinePoint } from '@/lib/types';
import Sparkline from './Sparkline';
import AlertSubscribeForm from './AlertSubscribeForm';

const STATUS_LABELS: Record<FloodStatus, { label: string; color: string }> = {
  major: { label: 'Major Flood', color: 'bg-red-500' },
  flood: { label: 'Flood Stage', color: 'bg-orange-500' },
  action: { label: 'Action Stage', color: 'bg-yellow-500' },
  normal: { label: 'Normal', color: 'bg-green-500' },
  percentile_95: { label: '≥95th Pct', color: 'bg-blue-700' },
  percentile_90: { label: '≥90th Pct', color: 'bg-blue-500' },
  percentile_75: { label: '≥75th Pct', color: 'bg-blue-300' },
  percentile_normal: { label: 'Below 75th Pct', color: 'bg-blue-200' },
  no_data: { label: 'No Data', color: 'bg-gray-500' },
};

interface Props {
  gage: GageWithStatus;
  onClose: () => void;
}

export default function GageDetailPanel({ gage, onClose }: Props) {
  const [sparkline, setSparkline] = useState<SparklinePoint[] | null>(null);
  const [percentile, setPercentile] = useState<Record<string, number> | null>(null);
  const [sparkLoading, setSparkLoading] = useState(true);
  const [pctLoading, setPctLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [sparkRes, pctRes] = await Promise.all([
          fetch(`/api/gages/${gage.site_no}/sparkline`).then(r => r.json()),
          fetch(`/api/gages/${gage.site_no}/percentile`).then(r => r.json()),
        ]);
        if (!cancelled) {
          setSparkline(Array.isArray(sparkRes) ? sparkRes : []);
          setPercentile(pctRes as Record<string, number>);
          setSparkLoading(false);
          setPctLoading(false);
        }
      } catch {
        if (!cancelled) {
          setSparkline([]);
          setPercentile(null);
          setSparkLoading(false);
          setPctLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [gage.site_no]);

  function computePercentileLabel(): string | null {
    if (!percentile || gage.last_gage_height === null) return null;
    const h = gage.last_gage_height;
    if (h >= (percentile.p90 ?? Infinity)) return '90th or higher';
    if (h >= (percentile.p75 ?? Infinity)) return '75th–90th';
    if (h >= (percentile.p50 ?? Infinity)) return '50th–75th';
    if (h >= (percentile.p25 ?? Infinity)) return '25th–50th';
    return 'below 25th';
  }

  const hasThresholds = gage.action_stage !== null || gage.flood_stage !== null || gage.major_flood_stage !== null;
  const statusInfo = STATUS_LABELS[gage.status] ?? { label: 'Unknown', color: 'bg-gray-500' };

  return (
    <div
      className="absolute top-0 right-0 h-full w-[380px] bg-gray-900 border-l border-gray-700 z-50 overflow-y-auto shadow-2xl flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white leading-tight">{gage.site_name}</h2>
            <div className="text-xs text-gray-400 mt-0.5 space-y-0.5">
              <div>Site #{gage.site_no}</div>
              {gage.county && <div>{gage.county}</div>}
              {gage.huc8 && <div>HUC8: {gage.huc8}</div>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none flex-shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-gray-700"
          >
            ×
          </button>
        </div>
        <a
          href={`https://waterdata.usgs.gov/monitoring-location/${gage.site_no}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-flex items-center gap-1"
        >
          View on USGS ↗
        </a>
      </div>

      {/* Current Status */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <span className={`${statusInfo.color} text-white text-xs font-semibold px-2 py-1 rounded`}>
            {statusInfo.label}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Gage Height</div>
            <div className="text-xl font-bold text-white">
              {gage.last_gage_height?.toFixed(2) ?? '—'} <span className="text-sm text-gray-400">ft</span>
            </div>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Streamflow</div>
            <div className="text-xl font-bold text-white">
              {gage.last_streamflow ? gage.last_streamflow.toLocaleString() : '—'} <span className="text-sm text-gray-400">cfs</span>
            </div>
          </div>
        </div>
        {gage.last_updated && (
          <div className="text-xs text-gray-500 mt-2">
            As of {new Date(gage.last_updated).toLocaleString()}
          </div>
        )}
      </div>

      {/* Thresholds */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Flood Thresholds</h3>
        <table className="w-full text-sm">
          <tbody>
            {[
              { label: 'Action Stage', value: gage.action_stage },
              { label: 'Flood Stage', value: gage.flood_stage },
              { label: 'Moderate Flood', value: gage.moderate_flood_stage },
              { label: 'Major Flood', value: gage.major_flood_stage },
            ].map(({ label, value }) => (
              <tr key={label} className={value === null ? 'opacity-40' : ''}>
                <td className="py-1 text-gray-400">{label}</td>
                <td className="py-1 text-right font-mono text-white">
                  {value !== null ? `${value.toFixed(1)} ft` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 7-Day Trend */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">7-Day Trend</h3>
        {sparkLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : sparkline && sparkline.length > 0 ? (
          <Sparkline data={sparkline} />
        ) : (
          <div className="text-sm text-gray-500 py-4 text-center">No trend data available</div>
        )}
      </div>

      {/* Percentile */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Historical Context</h3>
        {pctLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="text-sm text-gray-300">
            {computePercentileLabel()
              ? `Currently at the ${computePercentileLabel()} percentile for this date in the historical record.`
              : 'Historical percentile data not available for this gage.'}
          </div>
        )}
      </div>

      {/* Alert Subscription */}
      <div className="p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Alert Me</h3>
        <AlertSubscribeForm gage={gage} hasThresholds={hasThresholds} />
      </div>
    </div>
  );
}
