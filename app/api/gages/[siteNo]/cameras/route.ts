import { getRequestContext } from '@cloudflare/next-on-pages';
import { fetchSiteCameras } from '@/lib/nims';

export const runtime = 'edge';

export async function GET(_req: Request, { params }: { params: Promise<{ siteNo: string }> }) {
  try {
    const { siteNo } = await params;
    const { env } = getRequestContext();
    // v2 key busts any stale empty-array cache from initial failed attempts
    const cacheKey = `cameras:v2:${siteNo}`;
    
    const cached = await env.IL_FLOOD_KV.get(cacheKey, 'json') as any[] | null;
    // Only serve cache if it has actual results (empty array is a failed lookup, not a valid miss)
    if (Array.isArray(cached) && cached.length > 0) return Response.json(cached);
    
    const data = await fetchSiteCameras(siteNo);
    // Only cache successful non-empty results
    if (data.length > 0) {
      await env.IL_FLOOD_KV.put(cacheKey, JSON.stringify(data), { expirationTtl: 21600 });
    }
    return Response.json(data);
  } catch (err) {
    console.error('cameras error:', err);
    return Response.json([], { status: 200 });
  }
}
