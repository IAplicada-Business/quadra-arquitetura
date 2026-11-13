# Open questions

Last verified: 2026-11-08, commit 4ad4101 (branch main) plus uncommitted working tree.

Ambiguities, dead code, inconsistencies and possible bugs found while documenting. Nothing here was changed. Severity is a first guess: High (security, money, data loss), Medium (wrong behavior), Low (cleanup).

## Security and access

| # | Sev | Item | Evidence |
|---|---|---|---|
| OQ-01 | High | Five AI functions have `verify_jwt = false` and no check in code: `generate-activities`, `analyze-plant`, `generate-proposal`, `process-voice-command`, `search-prices-bh`. Anyone with the URL and the public anon key can spend Anthropic credit. | `supabase/config.toml`, each `index.ts` |
| OQ-02 | High | `analyze-plant` and `generate-memorial` fetch any URL sent in the body (server side request). | `supabase/functions/analyze-plant/index.ts` (`loadFileAsContentBlock`), `generate-memorial/index.ts` |
| OQ-03 | High | `client_pending_responses` allows anonymous INSERT and UPDATE with `true` at table level. The edge function validates the token, but the table can be written directly with the anon key. | `supabase/migrations/20260401202959_*.sql` |
| OQ-04 | High | `invoices` storage bucket is public. Fiscal documents are readable by anyone with the URL. Later migrations may change policies; the bucket flag was not re-checked. | `supabase/migrations/20260331235210_*.sql` |
| OQ-05 | Medium | Leads with `user_id IS NULL` (site leads) are visible to every authenticated user, not only the owning team. | `supabase/migrations/20260630120000_site_leads_anon_insert.sql` |
| OQ-06 | Medium | `.env` is tracked by git. It lists only `VITE_`/public key names, but the practice invites mistakes. | `git ls-files` |
| OQ-07 | Medium | `migrate-storage` is a one-off function whose own comment says to delete it after use. It is still present and expects a service key of another project as secret. | `supabase/functions/migrate-storage/index.ts` |
| OQ-08 | Medium | `check-notifications` and `generate-memorial` are not in `supabase/config.toml`. Their JWT setting depends on the platform default. `check-notifications` has no auth in code and writes with the service role. | `supabase/config.toml` |
| OQ-09 | Medium | `chat-assistant` reads with the service role but filters by the caller's `user_id` only, so it ignores team data, unlike the rest of the app. Intended? | `supabase/functions/chat-assistant/index.ts` |
| OQ-10 | Low | `delete-user` ignores errors of its cleanup deletes and does not clean other tables that hold the user id. | `supabase/functions/delete-user/index.ts` |
| OQ-11 | Low | Role `moderator` has no distinct behavior in code. `canEdit` from `usePermissions` is not used outside the hook. | `src/hooks/usePermissions.ts` |

## Automation

| # | Sev | Item | Evidence |
|---|---|---|---|
| OQ-12 | High | `check-notifications` is never called: no `functions.invoke`, no `cron.schedule`. `pg_cron` and `pg_net` are enabled but unused in migrations. Notifications from this function may not be produced in production, or a scheduler is configured outside the repo. | `supabase/functions/check-notifications/index.ts`, `supabase/migrations/20260319205031_*.sql` |
| OQ-13 | Medium | Rule "client without response" filters `status = 'pendente'`, but the table default and validation use `aguardando`. The rule likely never matches. | `check-notifications/index.ts` (rule 7), `20260401202959_*.sql` |
| OQ-14 | Medium | Trigger `notify_new_lead` fires on `lead_form_submissions`, but the site form inserts into `leads` and no code uses `lead_form_submissions`. Admins may not be notified of site leads. | `src/hooks/useSiteLead.ts`, `20260319205031_*.sql` |
| OQ-15 | Low | Rule numbering in `check-notifications` skips 5 (moved to the trigger). | source comments |
| OQ-16 | Low | `generate-proposal` has no caller in `src/`. | grep |

## Money and data

| # | Sev | Item | Evidence |
|---|---|---|---|
| OQ-17 | High | `payments.payment_type` defaults to `despesa` (not null). Payments created without it (lead conversion "Honorários", quote installments, contract revenue) are classified as expense by `useFinanceiroMetrics`, and the fallback by supplier name never applies. Revenue could be understated. The code comment "payment_type is never saved by the UI" is outdated since `Lancamentos` saves it. | `src/hooks/useFinanceiroMetrics.ts`, `20260410122315_*.sql`, `src/hooks/useLeads.ts` |
| OQ-18 | Medium | Status `cancelado` is used in the UI and metrics but is not in enum `payment_status`. Saving it would fail unless the column changed outside the migrations. | `src/pages/Lancamentos.tsx`, `20260206155922_*.sql` |
| OQ-19 | Medium | Converting an approved proposal creates a "Receita" payment (no project) and `convertToClient` may create a "Honorários" payment for the same proposal. Possible double revenue. | `src/pages/LeadDetail.tsx`, `src/hooks/useLeads.ts` |
| OQ-20 | Medium | Contract number `CONTR-<year>-<NNN>` uses the count of loaded contracts. Deleted or unloaded contracts can produce duplicates. No unique constraint was verified. | `src/pages/LeadDetail.tsx` |
| OQ-21 | Medium | `convertToClient` runs several writes without a transaction and ignores "not found" results of `.single()`. Partial failure leaves a closed lead without project. | `src/hooks/useLeads.ts` |
| OQ-22 | Low | Installment values are rounded per row, so the sum can differ from the total by cents. | `src/lib/cotacaoInstallments.ts` |
| OQ-23 | Low | `convertToClient` does not set `payment_type` and uses `source: "escritorio"`; the contract path sets no `source` (default `obra`). | same files |

## Inconsistent values

| # | Sev | Item | Evidence |
|---|---|---|---|
| OQ-24 | Medium | `OportStatus` includes `aberto`, but the DB CHECK allows only `backlog`, `em_analise`, `planejado`, `em_dev`, `entregue`, `descartado`. | `src/lib/oportunidades.functions.ts`, `20260915163213_buddy_oportunidades.sql` |
| OQ-25 | Low | `REACHED_CONTATO` in the funnel contains `em_contato`, which is not a lead status. | `src/lib/funnel.ts` |
| OQ-26 | Low | `etapaDaCompra` handles `em_rota`, which is not in enum `purchase_status`. | `src/lib/portalCompras.ts`, `20260206155922_*.sql` |
| OQ-27 | Medium | Cascade (`computeCascade`, `computeRecalculateAll`) uses calendar days, while timeline and reverse schedule use business days. | `src/hooks/useProjectActivities.ts` vs `src/lib/businessCalendar.ts` |
| OQ-28 | Low | National holiday Nov 20 is applied to all years, including years before it became national. Ash Wednesday is a full holiday (code comment says half day). | `src/lib/businessCalendar.ts` |
| OQ-29 | Low | `search-prices-bh` prompt hard-codes the year 2025. | `supabase/functions/search-prices-bh/index.ts` |
| OQ-30 | Low | Portal live trigger covers 14 tables but not `budget_quotes`, `scope_items` or `purchases`, which the portal shows. They refresh by the 15 s poll only. | `20261013210000_client_portal_live_updates.sql` |

## Generated types and docs drift

| # | Sev | Item | Evidence |
|---|---|---|---|
| OQ-31 | Medium | `src/integrations/supabase/types.ts` is stale: no `blog_posts`, `instagram_profiles`, `instagram_metrics`, `budget_quotes.valid_until`, `scope_items.note`. Code uses casts (`as never`, `as any`). | `types.ts`, migrations |
| OQ-32 | Low | The old root README claimed 15 edge functions, 99 migrations and 426 files; the repo now has 16 functions and 126 migrations. The README was rewritten. | git history |
| OQ-33 | Low | Comments in `src/lib/businessCalendar.ts` and `GenerateActivitiesDialog.tsx` mention Gemini; the functions use Anthropic. | grep |
| OQ-34 | Low | `docs/onboarding-videos.md` is in Portuguese (pre-existing). Docs policy says English. Not rewritten. | file |

## Structure and cleanup

| # | Sev | Item | Evidence |
|---|---|---|---|
| OQ-35 | Low | Route `/projects/kanban` is declared but nothing links to it. | `src/App.tsx`, `AppSidebar.tsx` |
| OQ-36 | Low | `src/pages/ContentPlaceholder.tsx` is not imported anywhere. | grep |
| OQ-37 | Low | `react-hook-form`, `zod` and `@hookform/resolvers` are only used by `src/components/ui/form.tsx`. Several other dependencies may also be unused (`heic2any` is used by `imageResize`; others not audited). | grep |
| OQ-38 | Low | Four lockfiles (`package-lock.json`, `bun.lock`, `bun.lockb`, untracked `pnpm-lock.yaml`). Package name is the template `vite_react_shadcn_ts`. | repo root |
| OQ-39 | Low | `src/lib/portal.ts` hardcodes a WhatsApp number in `WHATSAPP_URL`. Business number assumed, not verified. | `src/lib/portal.ts` |
| OQ-40 | Low | `BuddyBug.tsx` has 2158 lines. | file |

## Process

| # | Sev | Item |
|---|---|---|
| OQ-41 | Medium | No CI workflow. Tests, lint and build are not run automatically. |
| OQ-42 | Medium | How migrations and edge functions reach production is not defined in the repo (Lovable sync or Supabase CLI). |
| OQ-43 | Low | `src/test/q153.test.ts` and several comments refer to external sheets, videos and sprints ("Q153", "vídeo 16"). The source documents are not in the repo. |
