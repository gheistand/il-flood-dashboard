# Illinois Flood Dashboard

Real-time flood monitoring for Illinois stream gages, powered by USGS data. Built with Next.js + Cloudflare Pages/D1/KV.

**Live:** https://flood.gheistand.dev

---

## Features

- **256 active IL stream gages** on an interactive Mapbox map
- **Flood status color-coding**: Major / Flood / Action / Normal / Percentile-based
- **Gage detail panel**: 7-day sparkline, flood thresholds, historical percentile context
- **Email alert subscriptions**: Subscribe per-gage with threshold of your choice — no account needed
- **Unsubscribe links** in every alert email
- **Admin panel** at `/admin` for managing alerts and viewing subscriptions
- **Scheduled Worker** polling USGS every 15 minutes

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS v3 |
| Hosting | Cloudflare Pages |
| Database | Cloudflare D1 (SQLite) |
| Cache/State | Cloudflare KV |
| Email | Resend |
| Map | Mapbox GL JS via react-map-gl |
| Charts | Recharts |

---

## Setup

### Prerequisites
- Node.js 20+
- `npx wrangler` (Cloudflare Wrangler CLI)
- Cloudflare account + Resend account

### Local Development

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in your keys
npm run dev
```

### Environment Variables

**`.dev.vars` (local only, gitignored):**
```
RESEND_API_KEY=re_...
MAPBOX_TOKEN=pk.eyJ...
ALERTS_ENABLED=true
ADMIN_SECRET=floodadmin2026
```

**Cloudflare Pages secrets (production):**
```bash
echo "pk.eyJ..." | npx wrangler pages secret put MAPBOX_TOKEN --project-name il-flood-dashboard
echo "floodadmin2026" | npx wrangler pages secret put ADMIN_SECRET --project-name il-flood-dashboard
echo "true" | npx wrangler pages secret put ALERTS_ENABLED --project-name il-flood-dashboard
# RESEND_API_KEY is already set
```

---

## Database Setup

```bash
# Create D1 database (already done — see wrangler.toml for ID)
npx wrangler d1 create il-flood-dashboard-db

# Run migration
npx wrangler d1 execute il-flood-dashboard-db --remote --file=migrations/001_init.sql
```

---

## IL Counties GeoJSON

```bash
npx ts-node scripts/fetch-il-counties.ts
# or
npx tsx scripts/fetch-il-counties.ts
```

---

## Build & Deploy

```bash
# Build for Cloudflare Pages
npx @cloudflare/next-on-pages

# Deploy
npx wrangler pages deploy .vercel/output/static --project-name il-flood-dashboard --branch main
```

---

## GitHub Actions CI/CD

Automatic deploy on push to `main`. Requires adding a repo secret:

1. Go to repo **Settings → Secrets and variables → Actions**
2. Add `CLOUDFLARE_API_TOKEN` — a Cloudflare token with **Cloudflare Pages:Edit** permission
3. Account ID: `9253b6980ef499ada2142ecc68e3bb18`

---

## Resend DNS Setup (Required for production emails)

To send from `alerts@gheistand.dev` instead of `onboarding@resend.dev`:

1. Log into [Resend](https://resend.com)
2. Go to **Domains → Add Domain** → enter `gheistand.dev`
3. Add the DNS records Resend provides to Cloudflare DNS for `gheistand.dev`
4. Verify the domain in Resend

Until DNS is verified, alerts will send from `onboarding@resend.dev` (works for testing).

---

## Admin Panel

Visit `/admin` and enter the admin password (`floodadmin2026` by default, set via `ADMIN_SECRET` secret).

Features:
- Toggle alert sending globally
- View all active subscriptions
- View alert log
- Force-refresh gage data from USGS

---

## Data Sources

- **USGS Instantaneous Values API** — real-time gage readings (every 15 min)
- **USGS Statistics API** — historical percentile context
- **USGS Daily Values API** — 7-day sparkline

---

## License

Built by Glenn Heistand / ISWS/CHAMP for Illinois flood monitoring.
