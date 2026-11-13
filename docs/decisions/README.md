# Architecture decision records

Last verified: 2026-11-08, commit 4ad4101 (branch main) plus uncommitted working tree.

All records are inferred from code and comments. No ADR existed before. Status "accepted (inferred)" means the code follows it today.

## ADR-001: No custom backend, Supabase plus edge functions (inferred)

- Context: a small office needs a CRM and project system fast. The project is built and edited in Lovable.
- Decision: the browser talks to Supabase directly (PostgREST, Auth, Storage, Realtime). Server code is limited to Deno edge functions for secrets (Anthropic key), admin actions and the public portal.
- Consequences: access control must live in RLS and in edge functions. Several functions have `verify_jwt = false` and rely on code checks, and some have none (see [../open-questions.md](../open-questions.md)). No server to host or scale. Business logic ships in the client bundle.

## ADR-002: Team-based row visibility (inferred)

- Context: partners share data. First schema was per user (`auth.uid() = user_id`). `.lovable/plan.md` documents that `clients` blocked colleagues.
- Decision: `team_members` plus `get_team_user_ids()`. Rows keep the creator id and the whole team can read and edit (`20260327175547_*.sql`).
- Consequences: simple sharing, no per-role row filtering. Insert still requires own id. Some tables stay open to all authenticated users. Rows with `user_id` null (site leads) are visible to everyone authenticated.

## ADR-003: Deterministic logic in TypeScript, AI for text and extraction (inferred)

- Context: comments in `src/lib/businessCalendar.ts` and `supabase/functions/generate-checkpoints/index.ts` say calendars and checkpoints are deterministic and AI would be costly and could hallucinate.
- Decision: dates, funnels, finance and portal views are pure functions. AI is used for scope generation, plant reading, text drafts, price search and chat, with JSON schema output.
- Consequences: easy unit tests. Outdated comments mention another model vendor (see [../open-questions.md](../open-questions.md)).

## ADR-004: Client portal by secret token and service-role function (inferred)

- Context: clients have no accounts. They must see a safe subset of one project and answer pending items.
- Decision: a random token in the URL (`/client/:token`). The edge function `get-client-portal-data` validates it and reads with the service role, returning only whitelisted fields. One active token per project, rotated by RPC. Live refresh by Realtime broadcast plus polling.
- Consequences: no RLS protection on the portal path, so the field list is the security boundary. `client_pending_responses` also allows anonymous insert and update at table level.

## ADR-005: Screen permissions as data, permissive default (inferred)

- Context: partners wanted per-screen access without redesigning roles (`src/hooks/usePermissions.ts` comment).
- Decision: `user_permissions(page_key, can_view, can_edit)`. Admin sees all. A non-admin without rows sees all (backward compatibility). Restriction starts when an admin saves permissions for the person.
- Consequences: screen-level only; row security stays in RLS. A user with no rows is unrestricted by design.

## ADR-006: Invariants in database triggers (inferred)

- Context: the Buddy board migration states "as regras de negócio moram aqui, não na UI". Other migrations add validations for statuses, ratings and irreversible scope status.
- Decision: validate with BEFORE triggers and CHECK constraints, plus unique indexes against duplicates.
- Consequences: rules hold regardless of client. Error messages are Portuguese and surface in toasts.

## ADR-007: Public site content as data with code defaults (inferred)

- Context: partners edit site text and proposal PDF blocks without a developer.
- Decision: field definitions and defaults in TypeScript (`src/lib/siteContent.ts`, `src/lib/proposalBlocks.ts`). Only differences are stored; reads merge with defaults.
- Consequences: an empty table renders the standard site. Adding a field is a code change.
