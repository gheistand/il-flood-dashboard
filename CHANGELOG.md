# Changelog

All notable changes to the Illinois Flood Dashboard are recorded here.

---

## [Unreleased] — Phase 2 Roadmap

- NWS flood forecast data alongside USGS observed readings
- County-level landing pages (`/county/champaign`, etc.)
- RTFI infrastructure impact layer (blocked: IL has zero RTFI reference points as of 2026-05-06; potential BRIC grant deliverable)
- Mobile PWA + push notifications
- Public email subscription without account

---

## [1.1.0] — 2026-05-08

### Fixed
- **Cloudflare KV free tier limit exceeded** — poller was writing one `gage:{siteNo}` KV
  entry per gage per run: 256 gages × 96 runs/day = **24,576 KV puts/day** against a
  1,000/day free tier limit, causing 429 errors and broken KV state.

  **Fix:** Eliminated all KV puts from the poller. The previous flood status (needed for
  alert diffing) is now computed directly from D1's `gage_cache` table — the existing row
  already holds `last_gage_height` and all flood thresholds. We compute `prevStatus` before
  upserting the new values, then compare. Net poller KV puts: **0/day**.

  KV is still used for on-demand per-gage caches:
  - Sparkline data: 1-hour TTL (only written when a user opens a gage detail panel)
  - Percentile context: 6-hour TTL (same)

  These are low-volume and well within the free tier.

- Removed unused `GageKVState` interface from `workers/usgs-poller.ts`
- Added `last_gage_height` to the `existingRow` D1 type annotation (was implicitly `unknown`)

---

## [1.0.0] — 2026-05-07 — Phase 1 Launch

### Added

**Infrastructure**
- Cloudflare Pages project `il-flood-dashboard` at `https://flood.gheistand.dev`
- Cloudflare D1 database `il-flood-dashboard-db` with schema:
  - `gage_cache` — USGS gage metadata + latest readings + flood thresholds
  - `subscriptions` — email alert subscriptions (token-based, no account)
  - `alert_log` — sent alert history
  - `settings` — key/value store (global alerts toggle)
- Cloudflare KV namespace `IL_FLOOD_KV` for sparkline + percentile caches
- Scheduled Worker `il-flood-poller` — polls USGS every 15 minutes via cron
- GitHub Actions CI/CD (deploy on push to `main`)

**Frontend**
- Full-viewport Mapbox GL JS map centered on Illinois
- 256 active IL stream gages as colored circle markers:
  - 🔴 Red = major flood stage reached
  - 🟠 Orange = flood stage reached
  - 🟡 Yellow = action stage reached
  - 🟢 Green = below action stage (normal)
  - 🔵 Blue shades = no NWS thresholds, colored by historical percentile
  - ⚫ Gray = no data / stale reading (>3 hours old)
- IL county boundaries GeoJSON layer (toggleable, off by default)
- "Last updated" counter in top bar (ticks live in browser)

**Gage Detail Panel**
- Slide-out panel on gage click (380px, closes on X or map click)
- Current gage height (ft) + streamflow (cfs) with timestamp
- Flood threshold table: Action / Flood / Moderate / Major (grayed out when no data)
- 7-day sparkline (Recharts, gage height over time, fetched on open)
- Historical percentile context: "Currently at the Xth percentile for this date"
- Direct link to USGS waterdata.usgs.gov for full record

**Alert Subscriptions**
- Email-only, no account required (Phase 1)
- Subscribe per-gage to Action / Flood / Major Flood / 90th / 95th percentile thresholds
- Confirmation email via Resend on subscribe
- 6-hour dedup window per subscription (no repeat alerts unless gage drops and rises again)
- Unsubscribe page at `/alerts/unsubscribe?token=…` (token embedded in every alert email)
- Alert emails sent from `onboarding@resend.dev` (pending Resend DNS setup for `gheistand.dev`)

**Admin Panel**
- Password-protected at `/admin` (HttpOnly cookie, compared against `ADMIN_SECRET`)
- Toggle alert sending globally
- View active subscriptions
- View alert log
- Manual trigger for USGS poll

### Known Limitations at Launch
- NWS flood thresholds not available for ~40% of IL gages — percentile-based coloring used as fallback
- IL has zero RTFI reference points (verified 2026-05-06) — infrastructure impact layer deferred to Phase 2
- Alert emails send from `onboarding@resend.dev` until Resend DNS is verified for `gheistand.dev`
- No mobile PWA / push notifications (Phase 2)

---

## [0.1.0] — 2026-05-06 — Research & Planning

### Added
- Project spec (`memory/il-flood-dashboard-spec.md`)
- Verified USGS data availability: 256 active IL stream gages, 459 real-time time series
- Verified RTFI coverage: zero reference points in Illinois (`{"detail":"No reference points found for state abbreviation 'IL'"}`)
- Confirmed CloudFront blocking behavior on `api.waterdata.usgs.gov` without proper `User-Agent`
- Decided: Next.js + Cloudflare Pages/D1/KV/Workers + Mapbox + Resend
- Decided: Phase 1 open access (no Clerk auth), email alerts only
- Created `gheistand/il-flood-dashboard` GitHub repo
- Provisioned Cloudflare resources (Pages project, D1, KV)
