import { getRequestContext } from '@cloudflare/next-on-pages';
import { getAllGages } from '@/lib/db';

export const runtime = 'edge';

export async function GET() {
  try {
    const { env } = getRequestContext();
    const gages = await getAllGages(env.DB);
    return Response.json(gages);
  } catch (err) {
    console.error('GET /api/gages error:', err);
    return Response.json({ error: 'Failed to fetch gages' }, { status: 500 });
  }
}
