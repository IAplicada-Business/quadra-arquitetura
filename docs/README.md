# Quadra Arquitetura: technical documentation

Last verified: 2026-11-08, commit 4ad4101 (branch main) plus uncommitted working tree (untracked `pnpm-lock.yaml` only).

This folder is the technical documentation for AI assistants and contributors. It is written in English. The project README (`../README.md`) is in Brazilian Portuguese.

## Project summary

Quadra is an internal operating system for an architecture and interiors office in Belo Horizonte. It is one React single-page app backed by Supabase (Postgres, Auth, Storage, Edge Functions). It has four surfaces:

- A public site (`/`, `/blog`, `/blog/:slug`) with editable content.
- A staff app behind login (CRM, projects, schedule, finance, tasks, content, admin).
- A public client portal (`/client/:token`) that reads data through an edge function.
- A publishing entry for the partners (`/admin`) limited to blog and site text.

There is no custom backend server. Business logic lives in `src/` (pure functions in `src/lib/`, hooks in `src/hooks/`), in Postgres (RLS, triggers, functions) and in 16 Deno edge functions.

## Index

| File | Content |
|---|---|
| [architecture.md](architecture.md) | Layers, diagram, data flow, integrations, deployment |
| [modules.md](modules.md) | Every module: purpose, files, dependencies, import rules |
| [business-rules.md](business-rules.md) | Numbered rules (index) and `business-rules/*.md` per domain |
| [logic-flows.md](logic-flows.md) | Step-by-step flows with diagrams |
| [data-model.md](data-model.md) | Tables, relations, enums, triggers, buckets, migrations |
| [api.md](api.md) | Edge functions, RPCs, realtime channels, client contracts |
| [design-system.md](design-system.md) | Tokens, components, layout, accessibility |
| [configuration.md](configuration.md) | Env var names, config files, run, test, deploy |
| [testing.md](testing.md) | Test setup, map of tests, coverage gaps |
| [conventions.md](conventions.md) | Code and naming conventions seen in the repo |
| [decisions/README.md](decisions/README.md) | Architecture decision records (inferred) |
| [open-questions.md](open-questions.md) | Ambiguities, dead code, inconsistencies, possible bugs |
| [CONTRIBUTING-DOCS.md](CONTRIBUTING-DOCS.md) | How to keep these docs current |
| [onboarding-videos.md](onboarding-videos.md) | Pre-existing guide (pt-BR) for onboarding videos. Not rewritten. |

## Where to start

| Task | Read first | Then open |
|---|---|---|
| Add a screen or route | [modules.md](modules.md) (App shell, Permissions) | `src/App.tsx`, `src/lib/pagePermissions.ts`, `src/components/layout/AppSidebar.tsx` |
| Change who can see a screen | [business-rules/access.md](business-rules/access.md) | `src/lib/pagePermissions.ts`, `src/hooks/usePermissions.ts` |
| Change lead funnel or dashboards | [business-rules/commercial.md](business-rules/commercial.md) | `src/lib/funnel.ts`, `src/hooks/useComercialMetrics.ts` |
| Change schedule math | [business-rules/projects.md](business-rules/projects.md) | `src/lib/businessCalendar.ts`, `src/lib/reverseSchedule.ts` |
| Change finance numbers | [business-rules/finance.md](business-rules/finance.md) | `src/hooks/useFinanceiroMetrics.ts`, `src/pages/Lancamentos.tsx` |
| Change the client portal | [business-rules/portal.md](business-rules/portal.md), [api.md](api.md) | `supabase/functions/get-client-portal-data/index.ts`, `src/lib/portal*.ts` |
| Add or change an edge function | [api.md](api.md), [configuration.md](configuration.md) | `supabase/functions/<name>/index.ts`, `supabase/config.toml` |
| Add a table or column | [data-model.md](data-model.md) | `supabase/migrations/` |
| Change a notification rule | [business-rules/automation-ai.md](business-rules/automation-ai.md) | `supabase/functions/check-notifications/index.ts` |
| Edit public site or blog | [business-rules/content-site.md](business-rules/content-site.md) | `src/lib/siteContent.ts`, `src/lib/blog.ts` |
| Style a component | [design-system.md](design-system.md) | `src/index.css`, `tailwind.config.ts` |
| Run or write tests | [testing.md](testing.md) | `src/test/`, `vitest.config.ts` |
| Understand a doubtful behavior | [open-questions.md](open-questions.md) | |

## Reading rules

- Facts are taken from code. Items marked "(inferred)" are interpretation.
- Rule ids look like `BR-023`. They are stable. Do not renumber; append new ids.
- Business-facing UI text is Portuguese (pt-BR). Code identifiers mix Portuguese and English.
