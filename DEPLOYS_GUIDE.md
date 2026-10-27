# IronBeat — Deployment & Operations Guide

This guide covers everything needed to run IronBeat locally, provision the database, and ship it to Vercel with working PWA installation and iOS background playback.

---

## 1. Prerequisites

| Requirement | Version / notes |
| --- | --- |
| Node.js | 20.9 or newer. The repo includes `.nvmrc` with `24`. |
| npm | Ships with Node. `package-lock.json` is committed. |
| PostgreSQL | A [Neon](https://neon.tech) project (free tier works). |
| Vercel | Account for deployment (Hobby is sufficient). |
| GitHub | Repository access for automated deployments. |
| A music provider path | Public Piped/Invidious instances work out of the box; a self-hosted instance is recommended for long-term reliability. |

IronBeat does **not** use the official YouTube Data API, API keys, or embedded players.

---

## 2. Install locally

```bash
git clone https://github.com/WRusher24/IronBeat3.git
cd IronBeat3
npm install
```

Copy the environment template:

```bash
# macOS / Linux
cp .env.example .env.local

# Windows (Command Prompt)
copy .env.example .env.local

# Windows (PowerShell)
Copy-Item .env.example .env.local
```

---

## 3. Environment variables

Open `.env.local` and fill in the required values.

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/ironbeat?sslmode=require` | Use Neon’s **pooled** connection string in the app. |
| `AUTH_SECRET` | Yes | 64 random characters | Signs session JWTs. Must stay stable across deploys. |
| `PIPED_API_INSTANCES` | No | `https://pipedapi.example.com,https://pipedapi.ducks.party` | Overrides the built-in Piped search/stream fallback list. |
| `INVIDIOUS_INSTANCES` | No | `https://inv.example.com,https://yt.chocolatemoo53.com` | First entry is preferred for proxied AAC/MP4 streams. |
| `SEARCH_CACHE_TTL_SECONDS` | No | `180` | Per-instance in-memory cache duration. |
| `NEXT_PUBLIC_APP_URL` | No | `https://ironbeat.vercel.app` | Canonical URL used for Open Graph/Twitter metadata. Set in production. |

Generate a production secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Rules:

- Use a **different** secret for production, preview, and local development.
- Never commit `.env.local`.
- Rotating `AUTH_SECRET` invalidates every existing session; users must sign in again.

> If `AUTH_SECRET` is missing in development, IronBeat uses a clearly marked insecure fallback so the UI can boot. In production it throws instead of silently accepting weak sessions.

---

## 4. Create the Neon database

1. Sign in at <https://console.neon.tech> and create a project (for example `ironbeat`).
2. In **Dashboard → Connect**, choose the branch/database you want and copy the **pooled** connection string. It contains `-pooler` in the hostname.
3. Ensure the URL ends with `?sslmode=require` (Neon provides this).
4. Paste it into `.env.local` as `DATABASE_URL`.
5. Keep the **direct** (non-pooled) connection string available. Use it only if Drizzle Kit migrations are blocked by the pooler in your region.

Neon’s serverless driver (`@neondatabase/serverless`) is used over HTTPS, which works well with Vercel’s Node functions and does not require a long-lived TCP pool.

---

## 5. Create the schema

The repository includes a generated migration under `drizzle/`. Choose **one** of these paths.

### Recommended: apply the migration

```bash
npm run db:migrate
```

Use the direct connection string in `DATABASE_URL` if the pooled one rejects DDL.

### Fast path for a brand-new database

```bash
npm run db:push
```

`db:push` compares `src/db/schema.ts` with the database and applies the difference. It may prompt for confirmation. It is ideal for the first setup but should not replace reviewed migrations on an established database.

### Verify

```bash
npm run db:studio
```

Confirm these tables exist: `users`, `playlists`, `playlist_tracks`, `favorites`, `search_history`, `track_plays`, and `stream_sources`, plus their indexes and foreign keys.

`stream_sources` is the shared 15-minute cache of resolved media URLs used by the iOS audio relay. Apply the additive migration after pulling this version:

```bash
npm run db:migrate
```

If the table is missing, playback still works because the signed relay token carries the resolved media URL, but repeated retries and fallback source lookups will be slower.

---

## 6. Run locally and test

```bash
npm run dev
```

Open <http://localhost:3000>.

First-run checklist:

1. Register a new account — you should land on Home immediately (no approval step).
2. Type `brazilian phonk` in the hero search and submit.
3. Confirm the Search view loads results and the first result starts playing automatically. If iOS/Safari blocks autoplay, tap the play button in the mini player once.
4. Open the full player, seek, skip, toggle shuffle and repeat.
5. Navigate Home → Search → Library → Settings while audio plays. Playback must not pause or restart.
6. Create a playlist, add a track from search with the `+` button, then play the folder.
7. Save a favorite, play a few tracks, then press **Smart Shuffle** on Home or Library.
8. Switch themes in Settings. Confirm the palette applies immediately and survives a reload.
9. Sign out and back in. Confirm playlists/favorites/history are still yours and no other account can see them.

Quality gates:

```bash
npm run lint
npm run typecheck
npm run build
```

`npm run build` does not require a database connection.

---

## 7. Deploy to Vercel

### 7.1 Push the repository

```bash
git remote add origin https://github.com/WRusher24/IronBeat3.git
git add .
git commit -m "feat: IronBeat workout music PWA"
git push -u origin main
```

(A CI workflow at `.github/workflows/ci.yml` runs lint, typecheck, and build on pushes and pull requests.)

### 7.2 Import into Vercel

1. Open <https://vercel.com/new>.
2. Import `WRusher24/IronBeat3`.
3. Framework Preset: **Next.js** (auto-detected).
4. Root Directory: **`.`**.
5. Build Command: `npm run build`.
6. Install Command: `npm install`.
7. Output Directory: leave empty (Next.js default).
8. Node.js Version: **24.x** (or any version ≥ 20.9).

### 7.3 Add environment variables

In **Project → Settings → Environment Variables**, add:

| Key | Production | Preview | Development |
| --- | --- | --- | --- |
| `DATABASE_URL` | Production Neon branch | Preview Neon branch (optional, can share) | Local/dev branch |
| `AUTH_SECRET` | Unique 32+ char secret | Unique secret | Unique secret |
| `NEXT_PUBLIC_APP_URL` | `https://<your-production-domain>` | Leave unset | `http://localhost:3000` (optional) |
| `PIPED_API_INSTANCES` | Optional | Optional | Optional |
| `INVIDIOUS_INSTANCES` | Optional | Optional | Optional |

Preview deployments are public by default. If you share preview links, remember they can reach the same database branch unless you create a separate Neon branch.

### 7.4 Run the production migration

Once, from your machine, point `DATABASE_URL` at the production database and run:

```bash
npm run db:migrate
```

Do not run migrations as part of every Vercel build unless you have a controlled migration job; concurrent builds can race.

### 7.5 Deploy

Click **Deploy**. After the build finishes:

- Visit the production URL.
- Register a test account.
- Confirm search and playback work from the deployed domain.
- Open the site on an iPhone in Safari and add it to the home screen.

### 7.6 Custom domain (optional)

Add the domain in **Project → Settings → Domains**, update DNS as instructed, then set `NEXT_PUBLIC_APP_URL` to the final `https://` URL and redeploy so social images/metadata use the correct host.

---

## 8. PWA settings (already configured)

IronBeat ships with all PWA requirements wired in:

- `src/app/manifest.ts` → `/manifest.webmanifest` with name, short name, standalone display, portrait orientation, theme colors, categories, shortcuts, and 192/512/maskable icons.
- `public/icons/` → Apple touch icon (180×180), standard icons, a 1024px source render, maskable icon, and OG image. Icons are full-bleed with content in the central safe zone, so iOS’s squircle mask does not clip the mark.
- Root metadata → `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, `apple-mobile-web-app-status-bar-style`, Apple touch icon links, `mobile-web-app-capable`, theme color, viewport-fit=cover.
- `public/sw.js` → caches the offline shell, icons, and manifest; network-first navigation; stale-while-revalidate static assets. API and RSC requests are never cached.
- Service worker registration runs **only in production** to avoid stale dev caches.
- Security headers for `/sw.js` are set in `next.config.ts` (`Service-Worker-Allowed: /`, no long-lived caching).

Vercel provides HTTPS automatically, which is required for service workers and installation.

### iOS installation

1. Open the production URL in **Safari** (not Chrome or an in-app browser).
2. Tap **Share** → **Add to Home Screen**.
3. Confirm the title **IronBeat** and tap **Add**.
4. Launch from the home screen. It opens standalone, full screen, with the custom charcoal-and-amber icon.

If an old icon appears, remove the web app from the home screen and add it again. iOS caches home-screen icons aggressively.

---

## 9. Music provider reliability

IronBeat resolves streams through community infrastructure, not an official API. Public instances may be down, rate-limited, or blocked by YouTube’s anti-bot checks.

Current behavior:

- Search: Piped instances first, then Invidious. Results are cached briefly in memory.
- Stream lookup: Invidious with `local=true` (proxied, iOS-friendly) first, then other Invidious instances, then Piped audio or muxed MP4.
- The client tries every returned source before requesting a fresh resolution.
- Failed instances are cooled down for two minutes on that server instance.
- iPhone and iPad play through the authenticated same-origin relay at `/api/audio/[videoId]/stream`. The relay forwards range requests and uses a signed token that already contains the best resolved media URL, so range requests do not re-resolve providers. It prefers direct Invidious media URLs server-side, then cached/proxied sources, then a fresh provider resolution. This avoids requiring the phone itself to reach third-party media hosts. The route declares `maxDuration = 300`; if your Vercel plan enforces a lower limit, very long single connections may be cut and the client falls back to direct sources.
- Resolution now runs provider lookups in parallel (with short 6-second caps) and ignores stream cooldowns, because a transient failure in the only working instance was previously excluding it for 90 seconds.

For a dependable personal deployment, self-host Piped or Invidious:

1. Deploy Piped API (see the Piped project documentation) or an Invidious instance on a small VPS.
2. Verify it returns search results and `/streams/{id}` (Piped) or `/api/v1/videos/{id}?local=true` (Invidious).
3. Set `PIPED_API_INSTANCES` and/or `INVIDIOUS_INSTANCES` in Vercel to your own base URLs, comma-separated.
4. Keep at least two instances configured. The first working stream provider wins.
5. Redeploy so the new environment variables take effect.

Because caches and cooldowns live in process memory, each Vercel instance maintains its own state. That is intentional: a cold or unhealthy instance does not poison the others.

> Respect the terms and rate limits of any instance you use. IronBeat adds per-user rate limits and caches lookups to reduce load, but it is not a substitute for running your own provider at scale.

---

## 10. Production operations

| Topic | Recommendation |
| --- | --- |
| Database backups | Neon provides point-in-time restore on paid plans; verify your retention window. |
| Session rotation | Rotating `AUTH_SECRET` logs everyone out. Coordinate it with a release. |
| Logs | Vercel Functions logs include `[ironbeat:api]`, `[ironbeat:search]`, and `[ironbeat:stream]` prefixes. |
| Rate limits | Built-in limits are per server instance. For stronger protection, put Vercel WAF or an upstream limiter in front of `/api/auth/*`. |
| Search cache | Tune `SEARCH_CACHE_TTL_SECONDS` if providers are slow. |
| Dependency updates | Run `npm audit --omit=dev` before releases. Dev-only advisories in Drizzle Kit’s bundled esbuild do not ship to production. |
| Health checks | Use any authenticated GET such as `/login` for uptime checks. Do not poll authenticated APIs. |
| Media bandwidth | Desktop audio goes directly from the provider to the device. iOS audio is relayed same-origin and consumes Vercel function bandwidth/time; the direct fallback is used if the relay fails. |

---

## 11. Troubleshooting

### The app loads but every API returns 500

`DATABASE_URL` is missing or wrong, or the schema has not been created. Check Vercel logs for `DATABASE_URL is not set` or a Neon connection error, then run `npm run db:migrate`.

### Login succeeds but the session does not stick

- In production, the cookie is `Secure`. Use HTTPS (Vercel does this).
- If testing a production build over plain `http://localhost`, prefer `npm run dev`, or use an HTTPS tunnel.
- Verify `AUTH_SECRET` is identical across all instances of the deployment.

### Search returns 503 / “music service is catching its breath”

All configured providers failed or were cooling down. Retry in a minute, check the instance URLs in your environment, or set your own Piped/Invidious endpoints. Vercel logs show the exact failing instance.

### A track starts and immediately skips

The provider returned URLs that the device could not fetch, or the source expired. Tap next to retry; IronBeat will request a fresh Piped-backed resolution. For recurring failures, switch or self-host the provider instance.

### Autoplay did not start after tapping a vibe

Mobile browsers can block media started after an asynchronous fetch. IronBeat unlocks the media element on the first gesture and shows **“Tap play to start audio”** if the browser still refuses. One tap fixes it; subsequent tracks autoplay normally.

### iPhone shows results but audio never starts

- Confirm the app is version **1.1.1 or newer** in Settings. Settings also shows **iOS relay** when the iPhone is using the same-origin audio route.
- The first playback requires a tap. If you see **Tap play to start audio**, tap it once.
- Close and reopen the home-screen app, or remove/re-add it so the updated service worker and bundle load.
- If it still fails, the relay may be returning an error. Check Vercel function logs for `/api/audio/.../stream`; a 401 means the signed relay token expired or the session is invalid (pause/replay the track to mint a fresh token), and a 502 means every source failed. `[ironbeat:relay] ... returned 403` / `failed` lines identify the host or provider that blocked the byte fetch.
- `[ironbeat:stream] ... resolved in ...ms from X/Y providers` shows how many parallel provider lookups succeeded and how many media URLs were returned.
- Verify the phone can reach the app origin itself (it loads the search results, so it usually can). The relay then performs the provider fetch server-side.

### Audio stops when the screen locks

- Start playback with a user gesture at least once per session.
- Confirm you are using Safari on iOS, not an in-app browser (Instagram, Gmail, etc.).
- Check Low Power Mode and the hardware mute switch; media playback generally ignores the mute switch, but low-power policies vary by iOS version.
- The app sets `navigator.audioSession.type = "playback"` and Media Session handlers automatically. There is no extra configuration.

### PWA shows an old icon or stale UI

Remove the home-screen app, clear the site data if needed, and add it again. Bump the service worker cache version in `public/sw.js` when shipping shell changes.

### Build fails fetching Google Fonts

The build uses `next/font/google` (Plus Jakarta Sans + Instrument Serif). Ensure the build environment can reach Google Fonts. If your CI is offline, self-host the fonts or retry the build.

### 429 responses

You are hitting the per-user or per-IP limits. Wait for the `Retry-After` interval. Auth routes: 8 registrations / 10 minutes per IP; 25 login attempts / 10 minutes per IP; search: 45/minute per user; stream resolution: 80/minute per user.

---

## 12. Security checklist

- [ ] `AUTH_SECRET` is unique per environment and at least 32 characters.
- [ ] `.env.local` is not committed.
- [ ] Production database uses a dedicated Neon branch/user.
- [ ] HTTPS is enforced (automatic on Vercel).
- [ ] CSP/HSTS headers are present on production responses.
- [ ] Dependency audit reviewed (`npm audit --omit=dev`).
- [ ] Preview deployments do not expose a sensitive production database branch.
- [ ] Rate limiting is sufficient for your exposure; add a WAF if the app is public.
- [ ] Provider instances are trusted; environment overrides are admin-controlled.

---

## 13. Command reference

```bash
npm install            # install dependencies
npm run dev            # local development
npm run build          # production build
npm run start          # serve the build
npm run lint           # ESLint
npm run typecheck      # TypeScript
npm run db:generate    # generate migrations from schema
npm run db:migrate     # apply checked-in migrations
npm run db:push        # push schema directly (fresh DB)
npm run db:studio      # Drizzle Studio
npm run icons          # regenerate PWA/OG/favicon assets + silent clip
```
