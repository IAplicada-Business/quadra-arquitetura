# Business rules: automation and AI

Last verified: 2026-11-08, commit 4ad4101 (branch main) plus uncommitted working tree.

Related tests: none for the edge functions. Pure helpers used by the front end are covered (see each row).

## Notification sweep (`check-notifications`)

The function reads with the service role and has no authentication in code. No caller and no scheduler exist in the repo (see [open-questions.md](../open-questions.md)). Rule numbers in the source skip "5": it was moved to the trigger in BR-125.

| ID | Rule | Where | Conditions |
|---|---|---|---|
| BR-115 | Every rule skips an entity that already has a notification of the same type in the last 3 days. | `supabase/functions/check-notifications/index.ts` (`isDuplicate`) | |
| BR-116 | Overdue task (`task_overdue`): `schedule_tasks` with `end_date` before today, status not `executado` and progress below 100. | same | Notifies the task owner. |
| BR-117 | Payment due soon (`payment_due_soon`): due within 3 days, status not `pago`. | same | |
| BR-118 | Overdue payment (`payment_overdue`): due before today, status not `pago`. | same | |
| BR-119 | Material pending delivery (`material_pending_delivery`): active `material_tracking` purchased 7 or more days ago with delivered quantity below purchased. | same | |
| BR-120 | Quote without response (`quote_no_response`): `budget_quotes` with status `pendente` created 5 or more days ago. | same | |
| BR-121 | Client without response (`client_no_response`): `client_pending_responses` with status `pendente` for 5 or more days. Also creates a `voice_tasks` entry "Cobrar resposta do cliente: ..." (category `pendencias`, type `administrativo`, priority `alta` from 10 days, else `media`). | same | The table default status is `aguardando`, not `pendente`, so this rule may never match (see [open-questions.md](../open-questions.md)). |
| BR-122 | Stale project (`project_stale`): status `mobilizacao` or `execucao` with no activity update and no diary entry in 14 days. Also creates task "Atualizar acompanhamento: <name>" (category `cronograma`, type `obra`, priority `media`). | same | |
| BR-123 | Contract without invoice (`contract_no_nf`): contract `assinado` for 30 or more days with a project and no `invoices_nf` of type `emitida` for that project. Also creates task "Emitir NF do contrato ..." (category `financeiro`, priority `alta`). | same | |
| BR-124 | Internal tasks created by rules 121, 122 and 123 are not duplicated if the same user, project and title exist in the last 3 days. | same (`hasRecentVoiceTask`) | |
| BR-125 | A new row in `lead_form_submissions` notifies every admin (`new_lead`). | `supabase/migrations/20260319205031_*.sql` (`notify_new_lead`) | The public form writes to `leads`, not to this table (see [open-questions.md](../open-questions.md)). |

## AI behavior

All AI functions use model `claude-opus-5-5` through `npm:@anthropic-ai/sdk` and the secret `ANTHROPIC_API_KEY`. See [api.md](../api.md) for inputs and outputs.

| ID | Rule | Where | Conditions |
|---|---|---|---|
| BR-126 | Generated activities (`generate-activities`) follow the construction sequence demolition, structure, infrastructure, waterproofing, plaster, coverings, carpentry and stone, painting, fixtures and lighting, finishing, cleaning. The server keeps at most one dependency per activity. | `supabase/functions/generate-activities/index.ts` | Output uses a JSON schema. A refusal returns 422. |
| BR-127 | Activity `description` is the text plus "INCLUSO" and "NÃO INCLUSO" bullet lists, so the existing UI shows the structured scope. | same | |
| BR-128 | Plant analysis accepts images and PDFs up to 20 MB (`MAX_FILE_BYTES`). Mode `activities` returns environments and activities; without a mode, `focus` is required. | `supabase/functions/analyze-plant/index.ts` | The file is fetched from any `file_url` sent. |
| BR-129 | The descriptive memorial uses at most 5 documents with a file URL. | `supabase/functions/generate-memorial/index.ts` | Only images and PDFs are included. |
| BR-130 | Price search calls the web search tool for each material, with city default "Belo Horizonte". Per-material failure or refusal returns an empty result for that material. | `supabase/functions/search-prices-bh/index.ts` | |
| BR-131 | Voice commands are turned into tasks with a fixed schema (types, categories, priorities, optional due date, subtasks). | `supabase/functions/process-voice-command/index.ts` | |
| BR-132 | Chat context: the function loads the caller's own records (`user_id` equals caller; limits 50 to 100 rows per table), optional project or lead context, up to 10 stored messages of the project, merged with at most 18 session messages, capped at 20. | `supabase/functions/chat-assistant/index.ts` | Uses the service role but filters by caller id, not by team. |
| BR-133 | Project assistant actions: `sequence`, `analyze_budget`, `weekly_summary`, `estimate_costs`, `generate_materials`, `generate_schedule`, `financial_analysis`, `weekly_insights`. | `supabase/functions/project-ai-assistant/index.ts` | `project_id` and `action` required. |
| BR-134 | Content assistant actions: `generate_script`, `suggest_ideas`, `generate_hashtags`, `rewrite_hook`. | `supabase/functions/content-ai-assistant/index.ts` | Invalid action returns 400. |
| BR-135 | Rate limit errors from the API map to HTTP 429 with a Portuguese message in most AI functions. | AI functions | |
| BR-136 | Front-end errors from edge functions are unwrapped to the real message in the response body. | `src/lib/edgeFunctionError.ts` | Test: `src/test/edgeFunctionError.test.ts`. |
