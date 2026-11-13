# Configuration

Last verified: 2026-11-13, commit d629e0b (branch feat/sync-5s-aprovacao-cenarios-cliente) plus uncommitted working tree.

Only variable names are documented. Never commit or paste values.

## Environment variables

### Front end (Vite, prefix `VITE_`)

| Name | Purpose | Required | Read in |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL, also base for `/functions/v1/` calls | Yes | `src/integrations/supabase/client.ts`, hooks and pages |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public (anon) API key | Yes | `src/integrations/supabase/client.ts`, `src/hooks/useLivePortalData.ts` |
| `VITE_SUPABASE_PROJECT_ID` | Project id | No (present in `.env`, not read in `src/`) | none found |
| `VITE_PUBLIC_APP_URL` | Public base URL used to build portal links | No (falls back to current origin) | `src/lib/portalUrl.ts` |
| `VITE_SITE_TEAM_ID` | Team that owns the public site content | No (a fixed default id is used) | `src/lib/siteContent.ts` |

The repo root `.env` also holds `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (not read by front-end code). The `.env` file is tracked by git (see [open-questions.md](open-questions.md)). It contains public keys only by name; do not add private keys to it.

### Edge functions (Supabase secrets)

| Name | Purpose | Required by |
|---|---|---|
| `SUPABASE_URL` | Auto-injected project URL | all functions using Supabase |
| `SUPABASE_ANON_KEY` | Auto-injected anon key | `create-user`, `delete-user`, `chat-assistant`, `content-ai-assistant`, `generate-checkpoints`, `project-ai-assistant` |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-injected service key (never in front end) | `create-user`, `delete-user`, `chat-assistant`, `check-notifications`, `get-client-portal-data`, `submit-client-response`, `migrate-storage` |
| `ANTHROPIC_API_KEY` | Anthropic API key | `analyze-plant`, `chat-assistant`, `content-ai-assistant`, `generate-activities`, `generate-memorial`, `generate-proposal`, `process-voice-command`, `project-ai-assistant`, `search-prices-bh` |
| `MIGRATION_SECRET` | Shared secret for one-off storage copy | `migrate-storage` |
| `MIGRATION_TARGET_URL` | Target project URL | `migrate-storage` |
| `MIGRATION_TARGET_SERVICE_KEY` | Target service key | `migrate-storage` |

Secrets are managed in the Supabase project (or Lovable). They are not stored in the repo.

## Config files

| File | Content |
|---|---|
| `package.json` | Scripts and dependencies. Name `vite_react_shadcn_ts` (template name). |
| `vite.config.ts` | Dev server (host `::`, port 8080, HMR overlay off), alias `@`, plugins: React SWC, `lovable-tagger` (development mode only), `VitePWA` |
| `vitest.config.ts` | jsdom, globals, setup `src/test/setup.ts`, include `src/**/*.{test,spec}.{ts,tsx}` |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | TypeScript. `strict: false`, `noImplicitAny: false`, no unused checks |
| `eslint.config.js` | typescript-eslint recommended, react-hooks, react-refresh; `no-unused-vars` off |
| `tailwind.config.ts`, `postcss.config.js`, `components.json` | Styling and shadcn config |
| `supabase/config.toml` | `project_id` and `verify_jwt = false` for 14 functions |
| `index.html` | Meta tags, fonts, manifest link, theme preload script |
| `.lovable/plan.md` | Old Lovable plan (RLS change for `clients`) |
| `.gitignore` | Ignores `node_modules`, `dist`, `*.local`, logs, editor folders |

PWA manifest (in `vite.config.ts`): name "Quadra", `display: standalone`, theme `#1B2A4A`, background `#FAF7F2`, icons `public/pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png`. Workbox: `navigateFallback: "/"`, max file 5 MB, ignores `founders-*.png` and `socias-*.jpg`, runtime cache for Google Fonts.

Note: `index.html` links `/manifest.webmanifest`, which `vite-plugin-pwa` generates at build time.

## Feature flags

None found.

## Package managers

`package-lock.json` (npm), `bun.lock`, `bun.lockb` are tracked. `pnpm-lock.yaml` is untracked in the working tree at the time of verification. The README uses `npm`. Prefer npm to match `package-lock.json` (inferred).

## Run locally

```sh
npm i
npm run dev        # http://localhost:8080
```

Requires a `.env` with the `VITE_SUPABASE_*` names above. Node 22.15 was used for verification; no `engines` field exists.

## Scripts (`package.json`)

| Script | Command |
|---|---|
| `dev` | `vite` |
| `build` | `vite build` |
| `build:dev` | `vite build --mode development` |
| `lint` | `eslint .` |
| `preview` | `vite preview` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |

## Query cache and cross-device sync

- Default `QueryClient` (`src/App.tsx`): `staleTime` 5 min, `refetchOnWindowFocus` off.
- Project data keys (the values of `REALTIME_TABLE_QUERY_KEYS`) override it in `src/lib/queryDefaults.ts` (`applyProjectSyncDefaults`): `staleTime` and `refetchInterval` 5 s, refetch on focus and reconnect, no polling while the tab is hidden. This is the safety net behind Realtime (`useRealtimeInvalidation`), for blocked or dropped websockets.
- Content, blog, Instagram and dashboard queries keep the 5 min default or their own `staleTime`.
- The client portal polls every 5 s while visible (`PORTAL_POLL_MS` in `src/hooks/useLivePortalData.ts`).
- The service worker (`vite.config.ts`) caches static assets only, never API data.

## Test

`npm test` ran on 2026-11-08: 75 files, 702 tests passed (about 113 s). See [testing.md](testing.md).

## Deploy

- Front end: `npm run build` creates `dist/`. Publication is done in Lovable (Share, Publish). Custom domain: Lovable Settings, Domains. No CI or deploy script exists in the repo.
- Database and functions: files in `supabase/`. The way they reach production (Lovable sync or Supabase CLI) is not defined in the repo (see [open-questions.md](open-questions.md)).
- Sensitive operations (applying migrations, deploying functions, creating secrets) are manual and must be done deliberately.
