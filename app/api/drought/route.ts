import { getRequestContext } from '@cloudflare/next-on-pages';
import { fetchILDroughtSummary } from '@/lib/drought';

export const runtime = 'edge';

export async function GET() {
  try {
    const { env } = getRequestContext();
    const cacheKey = 'drought:IL';
    
    const cached = await env.IL_FLOOD_KV.get(cacheKey, 'json');
    if (cached) return Response.json(cached);
    
    const data = await fetchILDroughtSummary();
    if (data) {
      await env.IL_FLOOD_KV.put(cacheKey, JSON.stringify(data), { expirationTtl: 43200 });
    }
    return Response.json(data);
  } catch (err) {
    console.error('drought error:', err);
    return Response.json(null, { status: 200 });
  }
}
