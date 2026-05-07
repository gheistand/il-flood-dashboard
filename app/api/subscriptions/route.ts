import { getRequestContext } from '@cloudflare/next-on-pages';
import { sendConfirmationEmail } from '@/lib/resend';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json() as { email?: string; siteNo?: string; siteName?: string; triggerLevel?: string };
    const { email, siteNo, siteName, triggerLevel } = body;
    if (!email || !siteNo || !siteName || !triggerLevel) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const { env } = getRequestContext();
    const id = crypto.randomUUID();
    const token = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await env.DB.prepare(
      'INSERT INTO subscriptions (id, email, site_no, site_name, trigger_level, enabled, token, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)'
    )
      .bind(id, email, siteNo, siteName, triggerLevel, token, createdAt)
      .run();
    // Send confirmation email
    await sendConfirmationEmail({ to: email, siteName, triggerLevel, token, apiKey: env.RESEND_API_KEY });
    return Response.json({ success: true, message: `You'll get an email at ${email} when ${siteName} reaches the selected threshold. Check your inbox for confirmation.` });
  } catch (err) {
    console.error('POST /api/subscriptions error:', err);
    return Response.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    if (!email) return Response.json({ error: 'Email required' }, { status: 400 });
    const { env } = getRequestContext();
    const result = await env.DB.prepare('SELECT * FROM subscriptions WHERE email = ?').bind(email).all();
    return Response.json(result.results ?? []);
  } catch (err) {
    console.error('GET /api/subscriptions error:', err);
    return Response.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}
