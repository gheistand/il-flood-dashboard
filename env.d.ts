/// <reference types="@cloudflare/workers-types" />

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    IL_FLOOD_KV: KVNamespace;
    RESEND_API_KEY: string;
    MAPBOX_TOKEN: string;
    ADMIN_SECRET: string;
    ALERTS_ENABLED: string;
    NEXT_PUBLIC_MAPBOX_TOKEN?: string;
  }
}

export {};
