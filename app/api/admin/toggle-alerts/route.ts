import { getRequestContext } from '@cloudflare/next-on-pages';
import { setSetting } from '@/lib/db';

export const runtime = 'edge';

function checkAuth(req: Request, adminSecret: string): boolean {
  const auth = req.headers.get('Authorization');
  if (auth === `Bearer ${adminSecret}`) return true;
  const cookie = req.headers.get('Cookie') ?? '';
  const match = cookie.match(/admin_token=([^;]+)/);
  return match ? match[1] === adminSecret : false;
}

export async function POST(req: Request) {
  try {
    const { env } = getRequestContext();
    if (!checkAuth(req, env.ADMIN_SECRET)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json() as { enabled: boolean };
    await setSetting(env.DB, 'alerts_enabled', body.enabled ? 'true' : 'false');
    return Response.json({ success: true, alertsEnabled: body.enabled });
  } catch (err) {
    console.error('POST /api/admin/toggle-alerts error:', err);
    return Response.json({ error: 'Failed to toggle alerts' }, { status: 500 });
  }
}
