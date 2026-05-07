import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(_req.url);
    const token = url.searchParams.get('token');
    if (!token) return Response.json({ error: 'Token required' }, { status: 400 });
    const { env } = getRequestContext();
    const sub = await env.DB.prepare('SELECT * FROM subscriptions WHERE id = ? AND token = ?').bind(id, token).first();
    if (!sub) return Response.json({ error: 'Not found or invalid token' }, { status: 404 });
    await env.DB.prepare('DELETE FROM subscriptions WHERE id = ?').bind(id).run();
    return Response.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/subscriptions/[id] error:', err);
    return Response.json({ error: 'Failed to delete subscription' }, { status: 500 });
  }
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { env } = getRequestContext();
    const body = await _req.json() as { enabled?: boolean };
    await env.DB.prepare('UPDATE subscriptions SET enabled = ? WHERE id = ?').bind(body.enabled ? 1 : 0, id).run();
    return Response.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/subscriptions/[id] error:', err);
    return Response.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
