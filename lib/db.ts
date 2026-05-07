import type { GageCache, GageWithStatus, FloodStatus, Subscription } from './types';

function computeStatus(gage: GageCache): FloodStatus {
  const h = gage.last_gage_height;
  if (h === null) return 'no_data';

  // Check staleness: mark no_data only if reading is >24h old (sensors can lag)
  if (gage.last_updated) {
    const updated = new Date(gage.last_updated).getTime();
    if (Date.now() - updated > 24 * 60 * 60 * 1000) return 'no_data';
  }

  if (gage.major_flood_stage !== null && h >= gage.major_flood_stage) return 'major';
  if (gage.flood_stage !== null && h >= gage.flood_stage) return 'flood';
  if (gage.action_stage !== null && h >= gage.action_stage) return 'action';
  if (gage.action_stage !== null) return 'normal';

  // No thresholds — use dummy percentile markers
  // We can't compute real percentile here without KV, return percentile_normal
  return 'percentile_normal';
}

export function addStatus(gage: GageCache): GageWithStatus {
  return { ...gage, status: computeStatus(gage) };
}

export async function getAllGages(db: D1Database): Promise<GageWithStatus[]> {
  const result = await db.prepare('SELECT * FROM gage_cache').all<GageCache>();
  return (result.results ?? []).map(addStatus);
}

export async function getGage(db: D1Database, siteNo: string): Promise<GageWithStatus | null> {
  const result = await db
    .prepare('SELECT * FROM gage_cache WHERE site_no = ?')
    .bind(siteNo)
    .first<GageCache>();
  if (!result) return null;
  return addStatus(result);
}

export async function upsertGage(db: D1Database, gage: Partial<GageCache> & { site_no: string; site_name: string }): Promise<void> {
  await db
    .prepare(
      `INSERT INTO gage_cache (site_no, site_name, latitude, longitude, county, huc8, last_gage_height, last_streamflow, last_updated, flood_stage, action_stage, major_flood_stage, moderate_flood_stage, data_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(site_no) DO UPDATE SET
         site_name = excluded.site_name,
         latitude = COALESCE(excluded.latitude, latitude),
         longitude = COALESCE(excluded.longitude, longitude),
         county = COALESCE(excluded.county, county),
         huc8 = COALESCE(excluded.huc8, huc8),
         last_gage_height = excluded.last_gage_height,
         last_streamflow = excluded.last_streamflow,
         last_updated = excluded.last_updated,
         data_source = excluded.data_source`
    )
    .bind(
      gage.site_no,
      gage.site_name,
      gage.latitude ?? null,
      gage.longitude ?? null,
      gage.county ?? null,
      gage.huc8 ?? null,
      gage.last_gage_height ?? null,
      gage.last_streamflow ?? null,
      gage.last_updated ?? null,
      gage.flood_stage ?? null,
      gage.action_stage ?? null,
      gage.major_flood_stage ?? null,
      gage.moderate_flood_stage ?? null,
      gage.data_source ?? 'usgs'
    )
    .run();
}

export async function getSubscriptionsByToken(db: D1Database, token: string): Promise<Subscription | null> {
  return db.prepare('SELECT * FROM subscriptions WHERE token = ?').bind(token).first<Subscription>();
}

export async function deleteSubscription(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM subscriptions WHERE token = ?').bind(token).run();
}

export async function getActiveSubscriptionsForSite(
  db: D1Database,
  siteNo: string
): Promise<Subscription[]> {
  const result = await db
    .prepare('SELECT * FROM subscriptions WHERE site_no = ? AND enabled = 1')
    .bind(siteNo)
    .all<Subscription>();
  return result.results ?? [];
}

export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

export async function setSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(key, value)
    .run();
}
