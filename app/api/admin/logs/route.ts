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
      'SELECT * FROM alert_log ORDER BY sent_at DESC LIMIT 100'
    ).all();
    return Response.json(result.results ?? []);
  } catch (err) {
    console.error('GET /api/admin/logs error:', err);
    return Response.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
