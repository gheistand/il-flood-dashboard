import { getRequestContext } from '@cloudflare/next-on-pages';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { env } = getRequestContext();
    const body = await req.json() as { password?: string };
    if (body.password !== env.ADMIN_SECRET) {
      return Response.json({ error: 'Invalid password' }, { status: 401 });
    }
    const response = Response.json({ success: true });
    const headers = new Headers(response.headers);
    headers.set('Set-Cookie', `admin_token=${env.ADMIN_SECRET}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`);
    return new Response(response.body, { status: 200, headers });
  } catch (err) {
    console.error('POST /api/admin/login error:', err);
    return Response.json({ error: 'Login failed' }, { status: 500 });
  }
}
