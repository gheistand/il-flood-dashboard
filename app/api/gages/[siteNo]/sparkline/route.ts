import { getRequestContext } from '@cloudflare/next-on-pages';
import { fetchSparkline } from '@/lib/usgs';

export const runtime = 'edge';

export async function GET(_req: Request, { params }: { params: Promise<{ siteNo: string }> }) {
  try {
    const { siteNo } = await params;
    const { env } = getRequestContext();
    const cacheKey = `sparkline:${siteNo}`;
    const cached = await env.IL_FLOOD_KV.get(cacheKey, 'json');
    if (cached) return Response.json(cached);
    const data = await fetchSparkline(siteNo);
    await env.IL_FLOOD_KV.put(cacheKey, JSON.stringify(data), { expirationTtl: 3600 });
    return Response.json(data);
  } catch (err) {
    console.error('sparkline error:', err);
    return Response.json({ error: 'Failed to fetch sparkline' }, { status: 500 });
  }
}
