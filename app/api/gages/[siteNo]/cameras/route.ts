import { getRequestContext } from '@cloudflare/next-on-pages';
import { fetchSiteCameras } from '@/lib/nims';

export const runtime = 'edge';

export async function GET(_req: Request, { params }: { params: Promise<{ siteNo: string }> }) {
  try {
    const { siteNo } = await params;
    const { env } = getRequestContext();
    const cacheKey = `cameras:${siteNo}`;
    
    const cached = await env.IL_FLOOD_KV.get(cacheKey, 'json');
    if (cached) return Response.json(cached);
    
    const data = await fetchSiteCameras(siteNo);
    await env.IL_FLOOD_KV.put(cacheKey, JSON.stringify(data), { expirationTtl: 21600 });
    return Response.json(data);
  } catch (err) {
    console.error('cameras error:', err);
    return Response.json([], { status: 200 });
  }
}
