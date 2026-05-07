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
    const [subsResult, logResult, gagesResult, settingsResult] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) as count FROM subscriptions WHERE enabled = 1').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) as count FROM alert_log').first<{ count: number }>(),
      env.DB.prepare('SELECT COUNT(*) as count FROM gage_cache').first<{ count: number }>(),
      env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind('alerts_enabled').first<{ value: string }>(),
    ]);
    return Response.json({
      activeSubscriptions: subsResult?.count ?? 0,
      alertsSent: logResult?.count ?? 0,
      totalGages: gagesResult?.count ?? 0,
      alertsEnabled: settingsResult?.value === 'true',
    });
  } catch (err) {
    console.error('GET /api/admin error:', err);
    return Response.json({ error: 'Failed to fetch admin stats' }, { status: 500 });
  }
}
