import { fetchILGages } from '../lib/usgs';
import { upsertGage, getActiveSubscriptionsForSite, getSetting } from '../lib/db';
import { sendAlertEmail } from '../lib/resend';

interface Env {
  DB: D1Database;
  IL_FLOOD_KV: KVNamespace;
  RESEND_API_KEY: string;
  ADMIN_SECRET: string;
  ALERTS_ENABLED: string;
}

interface GageKVState {
  siteNo: string;
  gageHeight: number | null;
  status: string;
  lastChecked: string;
}

function computeStatusFromValues(
  gageHeight: number | null,
  actionStage: number | null,
  floodStage: number | null,
  majorFloodStage: number | null
): string {
  if (gageHeight === null) return 'normal';
  if (majorFloodStage !== null && gageHeight >= majorFloodStage) return 'major';
  if (floodStage !== null && gageHeight >= floodStage) return 'flood';
  if (actionStage !== null && gageHeight >= actionStage) return 'action';
  return 'normal';
}

const STATUS_RANK: Record<string, number> = {
  normal: 0,
  action: 1,
  flood: 2,
  major: 3,
};

async function runPoller(env: Env): Promise<{ updated: number; alertsSent: number }> {
  // Check global alerts enabled
  const alertsEnabled = await getSetting(env.DB, 'alerts_enabled');
  const shouldSendAlerts = alertsEnabled === 'true' || env.ALERTS_ENABLED === 'true';

  const gages = await fetchILGages();
  let updated = 0;
  let alertsSent = 0;

  for (const g of gages) {
    try {
      // Load existing gage from D1 (for thresholds)
      const existingRow = await env.DB
        .prepare('SELECT * FROM gage_cache WHERE site_no = ?')
        .bind(g.siteNo)
        .first<{ action_stage: number | null; flood_stage: number | null; major_flood_stage: number | null; site_name: string }>() ?? null;

      const actionStage = existingRow?.action_stage ?? null;
      const floodStage = existingRow?.flood_stage ?? null;
      const majorFloodStage = existingRow?.major_flood_stage ?? null;

      // Load previous KV state
      const kvKey = `gage:${g.siteNo}`;
      const prevState = await env.IL_FLOOD_KV.get<GageKVState>(kvKey, 'json');

      const currentStatus = computeStatusFromValues(g.gageHeight, actionStage, floodStage, majorFloodStage);
      const prevStatus = prevState?.status ?? 'normal';

      // Check if status worsened
      const currentRank = STATUS_RANK[currentStatus] ?? 0;
      const prevRank = STATUS_RANK[prevStatus] ?? 0;
      const statusWorsened = currentRank > prevRank;

      // Upsert gage cache
      await upsertGage(env.DB, {
        site_no: g.siteNo,
        site_name: g.siteName || existingRow?.site_name || g.siteNo,
        latitude: g.latitude,
        longitude: g.longitude,
        last_gage_height: g.gageHeight,
        last_streamflow: g.streamflow,
        last_updated: g.lastUpdated,
      });
      updated++;

      // Send alerts if status worsened
      if (shouldSendAlerts && statusWorsened && currentStatus !== 'normal') {
        const subs = await getActiveSubscriptionsForSite(env.DB, g.siteNo);
        for (const sub of subs) {
          // Check 6h dedup
          const lastAlerted = sub.last_alerted_at ? new Date(sub.last_alerted_at).getTime() : 0;
          const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
          if (lastAlerted > sixHoursAgo) continue;

          // Check if this subscription's trigger level is reached
          const triggerMet =
            (sub.trigger_level === 'action' && currentRank >= STATUS_RANK.action) ||
            (sub.trigger_level === 'flood' && currentRank >= STATUS_RANK.flood) ||
            (sub.trigger_level === 'major' && currentRank >= STATUS_RANK.major);

          if (!triggerMet && !sub.trigger_level.startsWith('percentile')) continue;

          const msgId = await sendAlertEmail({
            to: sub.email,
            siteName: sub.site_name,
            siteNo: g.siteNo,
            triggerLevel: sub.trigger_level,
            gageHeight: g.gageHeight,
            streamflow: g.streamflow,
            timestamp: g.lastUpdated,
            token: sub.token,
            apiKey: env.RESEND_API_KEY,
          });

          const logId = crypto.randomUUID();
          await env.DB.prepare(
            'INSERT INTO alert_log (id, subscription_id, site_no, trigger_level, gage_height, streamflow, sent_at, resend_message_id, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
            .bind(logId, sub.id, g.siteNo, sub.trigger_level, g.gageHeight, g.streamflow, new Date().toISOString(), msgId, sub.email)
            .run();

          await env.DB.prepare('UPDATE subscriptions SET last_alerted_at = ? WHERE id = ?')
            .bind(new Date().toISOString(), sub.id)
            .run();

          alertsSent++;
        }
      }

      // Save new KV state
      const newState: GageKVState = {
        siteNo: g.siteNo,
        gageHeight: g.gageHeight,
        status: currentStatus,
        lastChecked: new Date().toISOString(),
      };
      await env.IL_FLOOD_KV.put(kvKey, JSON.stringify(newState), { expirationTtl: 3600 });
    } catch (err) {
      console.error(`Error processing gage ${g.siteNo}:`, err);
    }
  }

  return { updated, alertsSent };
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runPoller(env));
  },

  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/trigger') {
      const auth = req.headers.get('Authorization');
      if (auth !== `Bearer ${env.ADMIN_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }
      ctx.waitUntil(
        runPoller(env).then((result) => {
          console.log('Manual poll result:', result);
        })
      );
      return Response.json({ success: true, message: 'Poller triggered' });
    }
    return new Response('Not found', { status: 404 });
  },
};
