import { getRequestContext } from '@cloudflare/next-on-pages';

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
    const result = await env.DB.prepare(
      'SELECT site_no, site_name, last_updated, last_gage_height FROM gage_cache ORDER BY last_updated ASC NULLS FIRST LIMIT 100'
    ).all();
    return Response.json(result.results ?? []);
  } catch (err) {
    console.error('GET /api/admin/stale-gages error:', err);
    return Response.json({ error: 'Failed to fetch stale gages' }, { status: 500 });
  }
}
