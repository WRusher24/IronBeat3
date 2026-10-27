# IronBeat

**Workout music, instantly.** IronBeat is a mobile-first personal music streaming and playlist PWA built for the gym floor: a hero search, one-tap mood decks, a persistent bottom-docked player, custom training playlists, Smart Shuffle, and iOS lock-screen playback that survives navigation.

Built from the ground up with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4**, **Drizzle ORM**, **Neon PostgreSQL**, and a global HTML5 audio engine. No official YouTube Data API, no embeds, no admin approval queue.

---

## Feature map

| Area | What it does |
| --- | --- |
| Accounts | Email/password registration with instant access, bcrypt-hashed passwords, signed HTTP-only session cookies, strict per-user data isolation. |
| Themes | Warm Neutral (default), Monochrome Ink, and Sunset Glow. Applied instantly and persisted locally + to the account. |
| Instant search | Hero search on Home, compact sticky search on the Search tab, Piped/Invidious failover, skeleton states, retry. |
| Quick launch | Horizontal chips of recent successful searches, with starter suggestions for new accounts. |
| Vibe deck | All eight mood cards on Home — no “All Moods” submenu. Each card launches a dynamic search and autoplays. |
| Playback | One global `<audio>` element, gapless queue advancing, shuffle, repeat off/all/one, seek, resume position, queue persistence. |
| iOS audio | `navigator.audioSession.type = "playback"`, Media Session metadata/artwork, play/pause/previous/next/seek handlers, unmuted gesture unlock, authenticated same-origin audio relay, “Tap play” fallback when autoplay is blocked. |
| Library | Create/rename/delete playlists, add tracks from search, remove tracks, play or shuffle a folder, favorites, recent plays. |
| Smart Shuffle | A fresh mix derived from your most-used search queries, favorite artists, and recent plays. |
| PWA | Web App Manifest, maskable icons, 180px Apple touch icon, standalone metadata, offline fallback, service worker (production only). |
| Security | Same-origin mutation checks, per-route rate limits, Zod validation, parameterized Drizzle queries, CSP and hardening headers in production. |

---

## Architecture

```text
iPhone / mobile browser
│
├─ Next.js App Router (server components + client views)
│  ├─ Root layout → Providers
│  │  ├─ ThemeProvider        (data-theme + localStorage + /api/me)
│  │  ├─ ToastProvider
│  │  └─ PlayerProvider       ← one <audio> element, queue, MediaSession
│  ├─ (app) layout            → MiniPlayer, NowPlayingSheet, BottomNav
│  └─ (auth) layout           → login / register
│
├─ Route handlers (Node runtime)
│  ├─ /api/auth/*             bcrypt passwords + JWT session cookie
│  ├─ /api/music/search       Piped search → Invidious fallback, TTL cache
│  ├─ /api/audio/[videoId]    Piped/Invidious stream resolution (AAC/MP4 first)
│  ├─ /api/audio/[videoId]/stream   Same-origin relay used by iOS Safari
│  ├─ /api/playlists/*        CRUD + track membership, ownership enforced
│  ├─ /api/favorites          Per-user favorites
│  ├─ /api/plays              Recent play history
│  ├─ /api/history            Quick-launch search chips
│  ├─ /api/smart-shuffle      Mix from history + favorites + plays
│  └─ /api/me                 Theme / profile persistence
│
└─ Data & media
   ├─ Neon PostgreSQL (Drizzle ORM, HTTP driver)
   └─ Piped / Invidious community instances → direct HTTPS audio streams
```

### Direct streams on desktop, same-origin relay on iOS

Desktop browsers receive **direct audio URLs** from the API and send them to a native `<audio>` element. This keeps byte-range seeking between the device and the media host and avoids serverless execution limits during hour-long mixes.

iPhone and iPad use the authenticated same-origin route `/api/audio/{videoId}/stream` instead. Mobile networks, content blockers, and iOS media handling can make third-party stream hosts unreachable or unreliable even when the API server can reach them. The relay:

- resolves sources in parallel across the configured providers instead of waiting through them one by one,
- prefers Invidious/Piped proxy URLs for the server-side fetch, because YouTube frequently returns 403 for direct googlevideo requests from Vercel’s datacenter IPs,
- embeds the chosen media URL inside the signed relay token, so every subsequent Range request streams immediately without resolving providers again,
- stores resolved sources in the optional `stream_sources` Neon cache (15-minute TTL) for retries and other server instances,
- forwards HTTP Range requests and returns `no-store` bytes without exposing provider URLs to the phone,
- falls back to cached/proxied sources, then a fresh provider resolution, and is time-boxed by `maxDuration = 300` on Vercel.

Both paths still feed a single native `<audio>` element, so iOS background playback, lock-screen controls, and seeking behave the same way. Direct sources use an 8-second stall watchdog; the relay gets 30 seconds, and the client automatically switches sources.

Provider resolution is deliberately conservative:

1. **Streams:** Invidious `?local=true` (proxied AAC/MP4) → other Invidious instances → Piped audio streams → Piped muxed MP4 as a last resort. iOS-friendly MP4/AAC sources are ranked first.
2. **Search:** Piped instances first, then Invidious. Successful searches and stream lookups are cached in memory (3 minutes and 20 minutes respectively).
3. **Failure handling:** Instances cool down after errors, the client retries the next source, then requests a fresh resolution with a Piped fallback. Unplayable tracks are skipped instead of stalling the queue.

Public Piped/Invidious instances are community infrastructure and can be unavailable or rate-limited. See [DEPLOYS_GUIDE.md](./DEPLOYS_GUIDE.md#music-provider-reliability) for pointing IronBeat at your own instance.

---

## Project structure

```text
src/
├─ app/
│  ├─ (app)/                 Authenticated shell
│  │  ├─ page.tsx            Home: hero search, chips, vibe deck, rails
│  │  ├─ search/             Sticky search + autoplay results
│  │  ├─ playlists/          Library tabs + playlist detail
│  │  └─ settings/           Themes, PWA install, data, account
│  ├─ (auth)/                Login & registration
│  ├─ api/                   Auth, music, stream resolution, library APIs
│  ├─ manifest.ts            Web App Manifest
│  ├─ icon.svg               Browser favicon source
│  ├─ layout.tsx             Fonts, metadata, providers, theme-boot script
│  └─ globals.css            Theme tokens, animations, seek bar, utilities
├─ components/
│  ├─ player/                PlayerProvider, MiniPlayer, NowPlayingSheet
│  ├─ ui/                    Buttons, fields, sheets, toasts, skeletons
│  ├─ track-*.tsx            Rows, lists, carousels
│  ├─ favorites-provider.tsx
│  ├─ search-bar.tsx / search-chips.tsx / vibe-deck.tsx
│  └─ providers.tsx
├─ db/                       Drizzle client + schema
├─ lib/
│  ├─ music/                 Piped & Invidious clients, caching, failover
│  ├─ auth-server.ts         Session → user resolution
│  ├─ session.ts             JWT signing/verification + cookie options
│  ├─ validators.ts          Zod request schemas
│  ├─ rate-limit.ts          In-memory per-instance limits
│  └─ theme.ts, vibes.ts, tracks.ts, format.ts
├─ proxy.ts                  Next.js 16 Proxy (auth boundary)
└─ types/                    Shared client/server types
```

---

## Quick start

**Prerequisites:** Node.js 20.9+ (`.nvmrc` pins 24), npm, a Neon PostgreSQL database, and a GitHub account (for deployment).

```bash
git clone https://github.com/WRusher24/IronBeat3.git
cd IronBeat3
npm install
cp .env.example .env.local
```

Open `.env.local` and set:

```bash
DATABASE_URL="postgresql://...@ep-...-pooler...neon.tech/ironbeat?sslmode=require"
AUTH_SECRET="a-long-random-string-at-least-32-characters"
```

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Create the schema (choose one):

```bash
npm run db:push       # fast sync for a fresh Neon project
# or
npm run db:migrate    # apply the checked-in Drizzle migration
```

Start the app:

```bash
npm run dev
```

Open <http://localhost:3000>, create an account, and you are in.

> Local `npm run dev` will start with an insecure development session secret if `AUTH_SECRET` is missing, but database features still need `DATABASE_URL`. Production refuses to start without a real secret.

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon PostgreSQL pooled connection string. |
| `AUTH_SECRET` | Yes in production | HS256 signing secret for session JWTs. At least 32 characters. Do not rotate casually — it signs every session. |
| `PIPED_API_INSTANCES` | No | Comma-separated Piped API bases. Defaults are built in. |
| `INVIDIOUS_INSTANCES` | No | Comma-separated Invidious API bases. Defaults are built in; the first is the preferred stream proxy. |
| `SEARCH_CACHE_TTL_SECONDS` | No | In-memory search cache TTL (default 180). |
| `NEXT_PUBLIC_APP_URL` | No | Canonical URL for Open Graph/metadata. Set to your production domain. |

See `.env.example` for the annotated list.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | ESLint (Next core web vitals + TypeScript rules). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run db:generate` | Generate SQL migrations from `src/db/schema.ts`. |
| `npm run db:migrate` | Apply checked-in migrations. |
| `npm run db:push` | Push the schema directly to Neon. |
| `npm run db:studio` | Open Drizzle Studio. |
| `npm run icons` | Regenerate PWA icons, OG image, favicon, and the silent unlock clip. |

---

## Data model

| Table | Key fields | Notes |
| --- | --- | --- |
| `users` | `id`, `email` (unique), `password_hash`, `display_name`, `theme` | Session subject is `users.id`. |
| `playlists` | `id`, `user_id`, `name`, `description`, `emoji` | Cascade delete; max 30 per account. |
| `playlist_tracks` | `playlist_id`, `user_id`, `video_id`, `title`, `artist`, `thumbnail`, `duration`, `position` | Unique per playlist/track; cascade delete. |
| `favorites` | `user_id`, `video_id`, `title`, `artist`, `thumbnail`, `duration` | Unique per user/track. |
| `search_history` | `user_id`, `query`, `created_at` | Powers quick-launch chips and Smart Shuffle. |
| `track_plays` | `user_id`, `video_id`, … , `played_at` | Powers “Jump back in” and Smart Shuffle. |
| `stream_sources` | `video_id` (primary key), `sources` (JSONB), `expires_at` | Optional shared cache of resolved media URLs for the relay; additive migration `0001`. |

Every read and write is scoped by `user_id`. Playlist track endpoints verify playlist ownership before touching membership rows.

---

## Security notes

- Passwords: bcrypt (cost 12), 8–72 characters, normalized email, timing-safe dummy comparison for unknown accounts.
- Sessions: 30-day HS256 JWT in an `httpOnly`, `SameSite=Lax`, `Secure` (production) cookie. Logout clears it.
- Authorization: API routes re-derive the user from the session; the proxy is only an optimistic redirect layer.
- Mutations: JSON only, same-origin checks, per-user/IP rate limits, Zod-validated payloads.
- Headers: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, referrer policy, permissions policy in production.
- Uploads: none. Track metadata is normalized server-side and HTML is rendered as text by React.
- Secrets: `.env.local` is gitignored; `.env.example` contains no real values.

---

## Documentation

- [DEPLOYS_GUIDE.md](./DEPLOYS_GUIDE.md) — local setup, Neon, schema, Vercel, PWA settings, provider reliability, troubleshooting.
- [USER_GUIDE.md](./USER_GUIDE.md) — sign-up, iPhone installation, themes, instant search, chips, mood decks, playlists, lock-screen playback.

---

**IronBeat** is built for quick sets, sweaty thumbs, and music that does not stop when you pocket your phone.
