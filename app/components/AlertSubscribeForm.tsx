'use client';

import { useState } from 'react';
import type { GageWithStatus, TriggerLevel } from '@/lib/types';

interface Props {
  gage: GageWithStatus;
  hasThresholds: boolean;
}

const ALL_OPTIONS: { value: TriggerLevel; label: string }[] = [
  { value: 'action', label: 'Action Stage' },
  { value: 'flood', label: 'Flood Stage' },
  { value: 'major', label: 'Major Flood Stage' },
  { value: 'percentile_90', label: '90th Percentile' },
  { value: 'percentile_95', label: '95th Percentile' },
];

export default function AlertSubscribeForm({ gage, hasThresholds }: Props) {
  const [email, setEmail] = useState('');
  const [triggerLevel, setTriggerLevel] = useState<TriggerLevel>(
    hasThresholds ? 'flood' : 'percentile_90'
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const options = hasThresholds
    ? ALL_OPTIONS
    : ALL_OPTIONS.filter((o) => o.value.startsWith('percentile'));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          siteNo: gage.site_no,
          siteName: gage.site_name,
          triggerLevel,
        }),
      });
      const data = await res.json() as { success?: boolean; message?: string; error?: string };
      if (data.success) {
        setSuccess(data.message ?? `You'll get an email at ${email} when ${gage.site_name} reaches the selected threshold.`);
        setEmail('');
      } else {
        setError(data.error ?? 'Failed to subscribe');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 text-sm text-green-300">
        ✅ {success}
        <button
          onClick={() => setSuccess(null)}
          className="block mt-2 text-xs text-green-500 hover:text-green-300"
        >
          Subscribe another email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      <select
        value={triggerLevel}
        onChange={(e) => setTriggerLevel(e.target.value as TriggerLevel)}
        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded px-3 py-2">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
      >
        {loading ? 'Subscribing...' : 'Notify Me'}
      </button>
    </form>
  );
}
