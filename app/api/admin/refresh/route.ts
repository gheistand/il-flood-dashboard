import { getRequestContext } from '@cloudflare/next-on-pages';
import { fetchILGages } from '@/lib/usgs';
import { upsertGage } from '@/lib/db';

export const runtime = 'edge';

function checkAuth(req: Request, adminSecret: string): boolean {
  const auth = req.headers.get('Authorization');
  if (auth === `Bearer ${adminSecret}`) return true;
  const cookie = req.headers.get('Cookie') ?? '';
  const match = cookie.match(/admin_token=([^;]+)/);
  return match ? match[1] === adminSecret : false;
}

export async function GET(req: Request) {
  try {
    const { env } = getRequestContext();
    if (!checkAuth(req, env.ADMIN_SECRET)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const gages = await fetchILGages();
    let updated = 0;
    for (const g of gages) {
      await upsertGage(env.DB, {
        site_no: g.siteNo,
        site_name: g.siteName,
        latitude: g.latitude,
        longitude: g.longitude,
        last_gage_height: g.gageHeight,
        last_streamflow: g.streamflow,
        last_updated: g.lastUpdated,
      });
      updated++;
    }
    return Response.json({ success: true, updated });
  } catch (err) {
    console.error('GET /api/admin/refresh error:', err);
    return Response.json({ error: 'Refresh failed' }, { status: 500 });
  }
}
