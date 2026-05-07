import { getRequestContext } from '@cloudflare/next-on-pages';
import { getGage } from '@/lib/db';

export const runtime = 'edge';

export async function GET(_req: Request, { params }: { params: Promise<{ siteNo: string }> }) {
  try {
    const { siteNo } = await params;
    const { env } = getRequestContext();
    const gage = await getGage(env.DB, siteNo);
    if (!gage) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json(gage);
  } catch (err) {
    console.error('GET /api/gages/[siteNo] error:', err);
    return Response.json({ error: 'Failed to fetch gage' }, { status: 500 });
  }
}
