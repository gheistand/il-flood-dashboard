import { getRequestContext } from '@cloudflare/next-on-pages';
import { fetchPercentile } from '@/lib/usgs';

export const runtime = 'edge';

export async function GET(_req: Request, { params }: { params: Promise<{ siteNo: string }> }) {
  try {
    const { siteNo } = await params;
    const { env } = getRequestContext();
    const cacheKey = `percentile:${siteNo}`;
    const cached = await env.IL_FLOOD_KV.get(cacheKey, 'json');
    if (cached) return Response.json(cached);
    const data = await fetchPercentile(siteNo);
    await env.IL_FLOOD_KV.put(cacheKey, JSON.stringify(data), { expirationTtl: 21600 });
    return Response.json(data);
  } catch (err) {
    console.error('percentile error:', err);
    return Response.json({ error: 'Failed to fetch percentile' }, { status: 500 });
  }
}
