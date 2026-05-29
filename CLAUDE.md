# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:3000
npm run build     # Production build
npm run start     # Start production server
npm run lint      # Run ESLint
```

## Architecture

**InfoGold** is a Next.js 15 app that displays real-time gold prices in COP (Colombian pesos) across multiple purity percentages, intended for gold buyers/jewelers.

### Hybrid routing
The project uses both Next.js routers:
- **App Router** (`src/app/`) — all UI (single page, client-side)
- **Pages Router** (`pages/api/`) — all API routes (server-side)

### Data flow
1. The client (`Formulario.tsx`) polls two endpoints every 15 seconds with exponential backoff (up to 60s on no change, 2× on error)
2. API routes scrape external sites using **Playwright** (headless Chromium) and cache results in-process for 60 seconds
3. Gold price formula: `((gold_usd * dolar_cop) / 31.1034768) * 1000 * (purity% / 100)` → COP per gram

### API routes (`pages/api/`)
| File | Source | Auth |
|------|--------|------|
| `getNetData.ts` | Scrapes `m.netdania.com/commodities/gold` | Required |
| `getUsd.ts` | Scrapes `pbit.bancodebogota.com` (Banco de Bogotá) | Required |
| `getGoldApi.ts` | Scrapes `goldprice.org` via Playwright | Required |
| `getGold.ts` | Fetches `data-asg.goldprice.org` JSON API | None |
| `login.ts` | Issues HMAC-SHA256 tokens; credentials hardcoded | None |
| `middleware.ts` | `withAuth` HOF that validates Bearer tokens | — |

`getNetData.ts` is the primary gold price source used in production (`api.netData()`). `getGoldApi.ts` (`api.goldPriceScraping()`) exists as an alternative but is not called in the current UI loop.

### Authentication
Custom token auth: HMAC-SHA256 signed base64 tokens, 24-hour expiry, stored in `localStorage`. `AUTH_SECRET` env var overrides the default key. Credentials are hardcoded in `login.ts` — change them via env vars if needed.

### Client state
`Formulario.tsx` persists `data` (gold/dolar values) and `dataForm` (computed price table) to `localStorage` to survive refreshes. All writes are throttled (2s) and only fire when values change.

### Deployment
Deployed to **Fly.io** (`info-gold` app, `iad` region) as a Docker container. The Dockerfile installs Playwright browsers (`npx playwright install --with-deps`) at image build time — this is required for the scraping API routes to work. The VM is configured with 3 GB RAM / 2 CPUs to handle headless Chromium.
