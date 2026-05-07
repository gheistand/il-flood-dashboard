'use client';

import { useEffect, useState, useMemo } from 'react';
import Map, { Marker, Layer, Source, NavigationControl } from 'react-map-gl/mapbox';
import type { GageWithStatus, FloodStatus } from '@/lib/types';
import GageDetailPanel from './GageDetailPanel';

// Injected at build time via NEXT_PUBLIC_MAPBOX_TOKEN env var
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';
const STATUS_COLORS: Record<FloodStatus, string> = {
  major: '#ef4444',
  flood: '#f97316',
  action: '#eab308',
  normal: '#22c55e',
  percentile_95: '#1d4ed8',
  percentile_90: '#3b82f6',
  percentile_75: '#93c5fd',
  percentile_normal: '#bfdbfe',
  no_data: '#6b7280',
};

function statusColor(status: FloodStatus): string {
  return STATUS_COLORS[status] ?? '#6b7280';
}

function formatAgo(isoString: string | null): string {
  if (!isoString) return 'unknown';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export default function MapView() {
  const [gages, setGages] = useState<GageWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedGage, setSelectedGage] = useState<GageWithStatus | null>(null);
  const [showCounties, setShowCounties] = useState(false);
  const [countyData, setCountyData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [viewState, setViewState] = useState({ longitude: -89.3985, latitude: 40.6331, zoom: 6.5 });

  useEffect(() => {
    async function loadGages() {
      try {
        const res = await fetch('/api/gages');
        const data = await res.json();
        if (Array.isArray(data)) {
          setGages(data);

        }
      } catch (err) {
        console.error('Failed to load gages:', err);
      } finally {
        setLoading(false);
      }
    }
    loadGages();
    const interval = setInterval(loadGages, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showCounties || countyData) return;
    fetch('/il-counties.geojson')
      .then((r) => r.json())
      .then((data) => setCountyData(data as GeoJSON.FeatureCollection))
      .catch(console.error);
  }, [showCounties, countyData]);

  const markers = useMemo(
    () =>
      gages
        .filter((g) => g.latitude !== null && g.longitude !== null)
        .map((g) => (
          <Marker
            key={g.site_no}
            longitude={g.longitude!}
            latitude={g.latitude!}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedGage(g);
            }}
          >
            <div
              className="rounded-full border-2 border-white cursor-pointer hover:scale-125 transition-transform"
              style={{
                width: 12,
                height: 12,
                backgroundColor: statusColor(g.status),
                boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
              title={g.site_name}
            />
          </Marker>
        )),
    [gages]
  );

  const newestUpdate = useMemo(() => {
    const dates = gages
      .map((g) => g.last_updated)
      .filter(Boolean)
      .map((d) => new Date(d!).getTime());
    if (!dates.length) return null;
    return new Date(Math.max(...dates));
  }, [gages]);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-gray-900/95 backdrop-blur border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-blue-400">🌊 Illinois Flood Dashboard</span>
          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">ISWS / CHAMP</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          {newestUpdate && (
            <span>Last updated: {formatAgo(newestUpdate.toISOString())}</span>
          )}
          <a
            href="https://github.com/gheistand/il-flood-dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
            title="GitHub"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </div>

      {/* Map */}
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: '100%', height: '100%' }}
        onClick={() => setSelectedGage(null)}
      >
        <NavigationControl position="top-right" style={{ marginTop: 56 }} />

        {showCounties && countyData && (
          <Source id="il-counties" type="geojson" data={countyData}>
            <Layer
              id="county-fill"
              type="fill"
              paint={{ 'fill-color': '#3b82f6', 'fill-opacity': 0.08 }}
            />
            <Layer
              id="county-line"
              type="line"
              paint={{ 'line-color': '#3b82f6', 'line-width': 0.8, 'line-opacity': 0.5 }}
            />
          </Source>
        )}

        {markers}
      </Map>

      {/* Legend (bottom-left) */}
      <div className="absolute bottom-8 left-4 z-40 bg-gray-900/95 backdrop-blur rounded-lg p-3 border border-gray-700 text-xs space-y-1.5">
        <div className="font-semibold text-gray-300 mb-1">Flood Status</div>
        {[
          { color: '#ef4444', label: 'Major Flood' },
          { color: '#f97316', label: 'Flood Stage' },
          { color: '#eab308', label: 'Action Stage' },
          { color: '#22c55e', label: 'Normal' },
          { color: '#1d4ed8', label: '≥95th Pct (no threshold)' },
          { color: '#3b82f6', label: '≥90th Pct' },
          { color: '#93c5fd', label: '≥75th Pct' },
          { color: '#bfdbfe', label: 'Below 75th Pct' },
          { color: '#6b7280', label: 'No recent data' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="text-gray-300">{label}</span>
          </div>
        ))}
        <div className="border-t border-gray-700 pt-2 mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showCounties}
              onChange={(e) => setShowCounties(e.target.checked)}
              className="accent-blue-500"
            />
            <span className="text-gray-300">County Boundaries</span>
          </label>
          <div className="mt-1 text-gray-500 opacity-60 cursor-not-allowed flex items-center gap-2">
            <input type="checkbox" disabled className="opacity-40" />
            <span>Infrastructure Impacts</span>
            <span className="text-gray-600 ml-1" title="Coming soon — Illinois has no RTFI coverage yet">
              (coming soon)
            </span>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950/60 z-50">
          <div className="bg-gray-900 rounded-xl px-6 py-4 border border-gray-700 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            <div className="text-gray-300">Loading gages...</div>
          </div>
        </div>
      )}

      {/* Gage count badge */}
      {!loading && gages.length > 0 && (
        <div className="absolute top-14 right-4 z-40 bg-gray-800/90 text-xs text-gray-400 px-2 py-1 rounded-md">
          {gages.filter(g => g.latitude && g.longitude).length} gages
        </div>
      )}

      {/* Detail Panel */}
      {selectedGage && (
        <GageDetailPanel
          gage={selectedGage}
          onClose={() => setSelectedGage(null)}
        />
      )}
    </div>
  );
}
