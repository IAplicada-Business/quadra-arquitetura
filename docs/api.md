# API

Last verified: 2026-11-08, commit 4ad4101 (branch main) plus uncommitted working tree.

There is no REST server of our own. The interfaces are: 16 Supabase Edge Functions, 5 Postgres RPCs, 2 Realtime channels, and PostgREST table access (see [data-model.md](data-model.md)).

## Conventions for edge functions

- Base URL: `<VITE_SUPABASE_URL>/functions/v1/<name>`. Method `POST` (all handle `OPTIONS` with CORS `*`).
- Body and response are JSON, except `chat-assistant` (stream).
- Errors: `{ "error": "<message>" }` with a status code. Messages are Portuguese in most functions, English in `project-ai-assistant`, `content-ai-assistant`, `chat-assistant`, `search-prices-bh`.
- `verify_jwt` is set to `false` for 14 functions in `supabase/config.toml`. `check-notifications` and `generate-memorial` are not listed there, so the platform default applies (JWT verified; inferred).
- "Auth in code" below means the function itself validates the caller. Where it says none, anyone who knows the URL and the public anon key can call it (see [open-questions.md](open-questions.md)).
- Secrets: see [configuration.md](configuration.md).

## Summary table

| Function | Purpose | `verify_jwt` | Auth in code | Called from |
|---|---|---|---|---|
| `create-user` | Admin creates or repairs a user | false | Bearer token, admin role | `src/pages/AdminUsersPage.tsx` |
| `delete-user` | Admin removes a user | false | Bearer token, admin role | `src/pages/AdminUsersPage.tsx` |
| `get-client-portal-data` | Portal payload | false | Portal token | `src/hooks/useLivePortalData.ts` |
| `submit-client-response` | Client answers a pending item | false | Portal token | `src/pages/ClientPortal.tsx` |
| `check-notifications` | Notification sweep | default | None | No caller found |
| `chat-assistant` | AI chat with business context (stream) | false | Bearer token (`getClaims`) | `src/hooks/useAIChat.ts` |
| `project-ai-assistant` | Project AI actions | false | Bearer token (`getClaims`) | `src/hooks/useProjectAI.ts`, `ProjectScopeTab`, `ProjectTrackingTab`, `ProjectScenariosTab` |
| `content-ai-assistant` | Content ideas and scripts | false | Bearer token (`getUser`) | `ContentCalendar`, `ContentPostSheet` |
| `generate-checkpoints` | Site visit checkpoints (no AI) | false | Bearer token (`getUser`) | `src/components/projects/ProjectScheduleTab.tsx` |
| `generate-activities` | Scope to activities | false | None | `GenerateActivitiesDialog` |
| `analyze-plant` | Plant analysis | false | None | `ImportPlantDialog`, `GenerateActivitiesDialog`, `ProjectDocumentsTab` |
| `generate-memorial` | Descriptive memorial | default | None in code | `MemorialDescritivoDialog` |
| `generate-proposal` | Proposal text | false | None | No caller found |
| `process-voice-command` | Voice to tasks | false | None | `VoiceAgentDialog` |
| `search-prices-bh` | Price search with web search | false | None | `PriceSearchDialog`, `ProjectScenariosTab` |
| `migrate-storage` | One-off storage copy | false | Header `x-migration-secret` | No caller (one-off) |

## Admin and portal functions

### `create-user`

- Input: `{ email, password, full_name, role }` with role in `admin | moderator | user`.
- Output 200: `{ user: { id, email, full_name, role }, repaired: boolean }`.
- Errors: 401 no or invalid bearer, 403 not admin, 400 missing field, invalid role, or create error; 500 role or team failure.
- Behavior: BR-007 to BR-009.
- Example (shape): `{"email":"a@b.com","password":"***","full_name":"Ana","role":"user"}`.

### `delete-user`

- Input: `{ user_id }`. Output 200: `{ success: true }`.
- Errors: 401, 403 not admin, 400 missing `user_id`, own account, or auth delete error.
- Behavior: BR-010.

### `get-client-portal-data`

- Input: `{ token }`. Auth: the token. The client sends the anon key in `apikey` (`src/hooks/useLivePortalData.ts`).
- Output 200: `{ project, tasks, payments, invoices, photos, weekly_reports, pending_responses, activities, closing_items, visits, quotes, analysis_imports, scope_items, purchases, onboarding }`. Typed in `src/lib/portal.ts` (`PortalData`).
- Errors: 400 token missing, 404 invalid or expired token or project missing, 500 generic.
- Behavior: BR-093 to BR-097. Uses the service role, so RLS is bypassed and the function is the only filter.

### `submit-client-response`

- Input: `{ token, weekly_report_id, pending_item, status, response_text?, client_name? }`, status in `respondido | aprovado | rejeitado`.
- Output 200: `{ success: true, data, duplicate?: true }`.
- Errors: 400 missing field or invalid status, 403 invalid or expired token, 500 insert or generic.
- Behavior: BR-099 to BR-101.

### `check-notifications`

- Input: none. Output: `{ success: true, notifications_created: n }`. Error 500 with message.
- Behavior: BR-115 to BR-124.

### `migrate-storage`

- Input: header `x-migration-secret`; query `bucket`, `path` (optional). Copies six buckets (`project-files`, `proposal-assets`, `invoices`, `oportunidade-anexos`, `onboarding-media`, `site-media`) from this project to a target project.
- Output: list of `{ bucket, path, status, bytes?, error? }`. Error 401 without the secret.
- The source comment says to delete it after use. It is still present.

## AI functions

All use model `claude-opus-5-5` and `ANTHROPIC_API_KEY`. A missing key returns 500. Rate limit maps to 429 where noted.

| Function | Input | Output | Errors |
|---|---|---|---|
| `chat-assistant` | `{ message, conversation_id?, history?, context?: { project_id?, lead_id? } }` | Stream of `data: {"choices":[{"delta":{"content":"..."}}]}` then `data: [DONE]` | 401, 500 |
| `project-ai-assistant` | `{ project_id, action, data }`, actions in BR-133 | JSON per action (for example `sequence` returns `{ suggestions: [...] }`) | 400, 401, 429, 500 |
| `content-ai-assistant` | `{ action, ...fields }`, actions in BR-134 | JSON text result | 400 invalid action, 401, 422 refusal, 429, 500 |
| `generate-activities` | `{ mode: "text"\|"audio"\|"image", content }` (`content` is text or an image URL) | `{ activities: [{ name, ambiente, discipline, area_m2, duration_days, description, incluso, nao_incluso, depends_on_indices }] }` | 400, 422, 429, 500 |
| `analyze-plant` | `{ file_url, focus?, instructions?, mode?, obra_type?, ambientes? }` | Mode `activities`: `{ ambientes, atividades }`. Otherwise a list of elements (`activity_name`, `environment`, `discipline`, `quantity`, `unit`, `estimated_days`) | 400 (bad file, too large, missing fields), 429, 502, 500 |
| `generate-memorial` | `{ project_data: { name, client_name, address, area_sqm, description, obra_type? }, documents: [{ name, file_url, category }] }` | Structured memorial (schema `MEMORIAL_SCHEMA`) | 429, 500 |
| `generate-proposal` | `{ leadName, projectType, constructionType, templateIntroduction, templateMethodology, templateDifferentials, services, estimatedArea, value, paymentConditions }` | Structured proposal text (max 2048 tokens) | 422, 429, 500 |
| `process-voice-command` | `{ transcript, projects }` | `{ project_id, project_name, tasks: [...] }` (`TASKS_SCHEMA`) | 400 empty transcript, 429, 500 |
| `search-prices-bh` | `{ activity_name, materials: [{ name, unit }], city? }` | `{ results: [{ material, unit, results: [{ supplier, neighborhood, price_min, price_max, unit, source_url }], searched_at }] }` | 400, 500 |
| `generate-checkpoints` | `{ project_id, activities: [{ id, name, discipline, start_date, end_date }], replace_existing? }` | `{ success, created, checkpoints: [{ visit_date, visit_type, activity_name }] }` | 400, 401, 500 |

Notes:

- `analyze-plant` and `generate-memorial` download any URL passed in `file_url` / `documents[].file_url` (server side fetch).
- `search-prices-bh` runs one model call per material with the `web_search_20260209` tool (`max_uses` 5).

## RPCs (Postgres)

| RPC | Arguments | Returns | Caller | Auth |
|---|---|---|---|---|
| `rotate_client_portal_token` | `p_project_id uuid` | new `client_portal_tokens` row | `src/hooks/useClientPortalToken.ts` | `authenticated`, invoker rights (RLS applies) |
| `recusar_entrega_oportunidade` | `p_id uuid`, `p_motivo text` | void (errors with codes `P0002`, `22023`) | `src/lib/oportunidades.functions.ts` | authenticated |
| `get_public_site_content` | `p_team_id uuid` | rows of content | `src/hooks/useSiteContent.ts` | anon |
| `get_public_blog_posts` | `p_team_id uuid` | published list with `reading_chars` | `src/hooks/useBlog.ts` | anon |
| `get_public_blog_post` | `p_team_id uuid`, slug | one published post | `src/hooks/useBlog.ts` | anon |
| `has_role` | `_user_id`, `_role` | boolean | edge functions, RLS | internal |

## Realtime

| Channel | Type | Sender | Listener |
|---|---|---|---|
| `portal:<token>` | broadcast, event `portal_changed` | SQL `notify_client_portal_change` (`realtime.send`) | `src/hooks/useLivePortalData.ts` |
| `notifications-realtime-<userId>-<random>` | `postgres_changes` INSERT on `notifications` filtered by `user_id` | Postgres | `src/hooks/useNotifications.ts` |

## Client-side helpers

- `edgeFunctionErrorMessage` (`src/lib/edgeFunctionError.ts`) extracts the `error` field from non-2xx responses.
- Raw `fetch` calls send `Authorization: Bearer <access_token>` (`src/hooks/useProjectAI.ts`). `supabase.functions.invoke` adds it automatically.
