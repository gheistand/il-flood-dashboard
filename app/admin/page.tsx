'use client';

import { useState } from 'react';

interface AdminSub {
  id: string;
  email: string;
  site_name: string;
  trigger_level: string;
  last_alerted_at: string | null;
  created_at: string;
}

interface AdminLog {
  id: string;
  email: string | null;
  site_no: string;
  trigger_level: string;
  gage_height: number | null;
  sent_at: string;
}

interface AdminGage {
  site_no: string;
  site_name: string;
  last_updated: string | null;
  last_gage_height: number | null;
}

interface AdminStats {
  activeSubscriptions: number;
  alertsSent: number;
  totalGages: number;
  alertsEnabled: boolean;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<AdminSub[]>([]);
  const [alertLog, setAlertLog] = useState<AdminLog[]>([]);
  const [staleGages, setStaleGages] = useState<AdminGage[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
      loadData();
    } else {
      setLoginError('Invalid password');
    }
  }

  async function loadData() {
    try {
      const [statsRes, subsRes, logRes, gagesRes] = await Promise.all([
        fetch('/api/admin'),
        fetch('/api/admin/subscriptions'),
        fetch('/api/admin/logs'),
        fetch('/api/admin/stale-gages'),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (subsRes.ok) setSubscriptions(await subsRes.json());
      if (logRes.ok) setAlertLog(await logRes.json());
      if (gagesRes.ok) setStaleGages(await gagesRes.json());
    } catch {
      // ignore
    }
  }

  async function toggleAlerts() {
    if (!stats) return;
    const res = await fetch('/api/admin/toggle-alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !stats.alertsEnabled }),
    });
    if (res.ok) {
      const data = await res.json() as { alertsEnabled: boolean };
      setStats((prev) => prev ? { ...prev, alertsEnabled: data.alertsEnabled } : prev);
      setMessage(`Alerts ${data.alertsEnabled ? 'enabled' : 'disabled'}`);
      setTimeout(() => setMessage(''), 3000);
    }
  }

  async function forceRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/admin/refresh');
      const data = await res.json() as { updated?: number };
      setMessage(`Refreshed ${data.updated ?? 0} gages`);
      setTimeout(() => setMessage(''), 3000);
      loadData();
    } finally {
      setRefreshing(false);
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-xl p-8 max-w-sm w-full border border-gray-700">
          <h1 className="text-xl font-bold text-white mb-6 text-center">🌊 Admin Panel</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              autoFocus
            />
            {loginError && <div className="text-red-400 text-sm">{loginError}</div>}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">🌊 Illinois Flood Dashboard — Admin</h1>
          <a href="/?admin=back" className="text-blue-400 hover:text-blue-300 text-sm">← Back to Map</a>
        </div>

        {message && (
          <div className="bg-green-900/30 border border-green-700 text-green-300 rounded-lg px-4 py-2 text-sm">
            {message}
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Active Subscriptions', value: stats.activeSubscriptions },
              { label: 'Alerts Sent', value: stats.alertsSent },
              { label: 'Total Gages', value: stats.totalGages },
              { label: 'Alerts', value: stats.alertsEnabled ? 'ON' : 'OFF', highlight: stats.alertsEnabled },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-xs mb-1">{label}</div>
                <div className={`text-2xl font-bold ${highlight !== undefined ? (highlight ? 'text-green-400' : 'text-red-400') : 'text-white'}`}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={toggleAlerts}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              stats?.alertsEnabled
                ? 'bg-red-700 hover:bg-red-600 text-white'
                : 'bg-green-700 hover:bg-green-600 text-white'
            }`}
          >
            {stats?.alertsEnabled ? 'Disable Alerts' : 'Enable Alerts'}
          </button>
          <button
            onClick={forceRefresh}
            disabled={refreshing}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-700 hover:bg-blue-600 disabled:bg-blue-900 text-white transition-colors"
          >
            {refreshing ? 'Refreshing...' : 'Force Refresh Now'}
          </button>
        </div>

        {/* Subscriptions */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 font-semibold text-sm">Active Subscriptions</div>
          {subscriptions.length === 0 ? (
            <div className="px-4 py-6 text-gray-500 text-sm text-center">No subscriptions yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800">
                  <tr>
                    {['Email', 'Site', 'Threshold', 'Last Alerted', 'Created'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-gray-400 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => (
                    <tr key={s.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="px-3 py-2 text-gray-300">{s.email}</td>
                      <td className="px-3 py-2 text-gray-300">{s.site_name}</td>
                      <td className="px-3 py-2 text-gray-400">{s.trigger_level}</td>
                      <td className="px-3 py-2 text-gray-500">{s.last_alerted_at ? new Date(s.last_alerted_at).toLocaleDateString() : '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Alert Log */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 font-semibold text-sm">Recent Alerts (last 100)</div>
          {alertLog.length === 0 ? (
            <div className="px-4 py-6 text-gray-500 text-sm text-center">No alerts sent yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800">
                  <tr>
                    {['Email', 'Site', 'Trigger', 'Height', 'Sent At'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-gray-400 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alertLog.map((l) => (
                    <tr key={l.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="px-3 py-2 text-gray-300">{l.email}</td>
                      <td className="px-3 py-2 text-gray-300">{l.site_no}</td>
                      <td className="px-3 py-2 text-gray-400">{l.trigger_level}</td>
                      <td className="px-3 py-2 text-gray-400">{l.gage_height?.toFixed(2) ?? '—'} ft</td>
                      <td className="px-3 py-2 text-gray-500">{new Date(l.sent_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stale Gages */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 font-semibold text-sm">Stale Gages (oldest first)</div>
          {staleGages.length === 0 ? (
            <div className="px-4 py-6 text-gray-500 text-sm text-center">No gage data loaded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800">
                  <tr>
                    {['Site', 'Name', 'Last Updated', 'Height'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-gray-400 font-medium text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staleGages.slice(0, 50).map((g) => (
                    <tr key={g.site_no} className="border-t border-gray-800 hover:bg-gray-800/50">
                      <td className="px-3 py-2 text-gray-400 font-mono text-xs">{g.site_no}</td>
                      <td className="px-3 py-2 text-gray-300">{g.site_name}</td>
                      <td className="px-3 py-2 text-gray-500">{g.last_updated ? new Date(g.last_updated).toLocaleString() : '—'}</td>
                      <td className="px-3 py-2 text-gray-400">{g.last_gage_height?.toFixed(2) ?? '—'} ft</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
