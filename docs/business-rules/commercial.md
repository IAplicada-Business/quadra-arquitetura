# Business rules: commercial (leads, partners, clients, proposals, contracts)

Last verified: 2026-11-08, commit 4ad4101 (branch main) plus uncommitted working tree.

## Leads and funnel

| ID | Rule | Where | Conditions, exceptions, tests |
|---|---|---|---|
| BR-016 | Lead statuses: `novo`, `contato_feito`, `reuniao_agendada`, `proposta_enviada`, `fechado`, `perdido_definitivo`, `backlog_recontato`, `perdido` (legacy). | `src/hooks/useLeads.ts` (`LEAD_STATUSES`) | The legacy column `perdido` is hidden when empty (`src/pages/LeadsPipeline.tsx`). Test: `src/test/leadsPipelinePage.test.tsx`. |
| BR-017 | The "next step" button advances along `novo` -> `contato_feito` -> `reuniao_agendada` -> `proposta_enviada` -> `fechado`. Terminal statuses (`fechado`, `perdido_definitivo`, `backlog_recontato`, `perdido`) have no next step. | `src/pages/LeadsPipeline.tsx` (`getNextStatus`, `TERMINAL_STATUSES`) | Drag and drop can move a card to any column. |
| BR-018 | Moving a lead to `fechado` without `converted_client_id` runs the conversion (BR-019). Otherwise it is a plain status update. | `src/pages/LeadsPipeline.tsx` (`moveStatus`) | Also run when a proposal is turned into a contract (BR-030). |
| BR-019 | Conversion: find an existing client by email, else by phone. Create a client only if none matches. Set the lead `status=fechado`, `converted_client_id`, `converted_at`. Create a project `"<lead name> — <project type>"` with status `planejamento` and the next project code. If the lead has an approved proposal, copy its value to `estimated_budget` and create a pending "Honorários" payment (source `escritorio`). | `src/hooks/useLeads.ts` (`convertToClient`) | Steps are not in a transaction. A failure after step 3 leaves a closed lead without project. Lookups use `.single()` and ignore "not found". No test. |
| BR-020 | Funnel stages: Leads (top), Contato, Reunião, Proposta, Fechado. A lead counts in a stage if its status is "at least" that stage. Conversion of each stage is relative to the previous one, rounded. Total is closed over top. | `src/lib/funnel.ts` (`computeFunnel`, `convRate`) | Test: `src/test/funnel.test.tsx`. |
| BR-021 | Period funnel: top = leads created in the period. Closed = leads closed in the period (by `closedAt`: `converted_at`, else `updated_at`, else `created_at`). Leads closed in the period but created earlier are added to the Contato, Reunião and Proposta stages so closed never exceeds proposals. | `src/lib/funnel.ts` (`computeFunnelByPeriod`, `closedAt`) | Test: `src/test/funnel.test.tsx`. |
| BR-022 | Periods: `mes_atual`, `mes_passado` (window `[start, end)`), `trimestre` (current + 2 previous months), `semestre` (current + 5), `ano` (from Jan 1), `tudo`. | `src/lib/funnel.ts` (`periodBounds`, `inPeriod`) | Test: `src/test/funnel.test.tsx`, `src/test/monthRange.test.ts`. |
| BR-023 | Pipeline by month (last six months): closed by month of `closedAt`; proposals (`proposta_enviada`) and in-progress (`contato_feito`, `reuniao_agendada`) by creation month. | `src/lib/funnel.ts` (`pipelineByMonth`) | Status `em_contato` appears in `REACHED_CONTATO` but is not a lead status (see [open-questions.md](../open-questions.md)). |
| BR-024 | Conversion by group (origin, project type): total = created in period, closed = closed in period, rate sorted by rate then volume. Empty key becomes `outro`. | `src/lib/funnel.ts` (`conversionBy`) | Test: `src/test/funnel.test.tsx`. |
| BR-025 | Lost reasons are counted only for `perdido` and `perdido_definitivo` leads created in the period that have a non-empty reason. | `src/lib/funnel.ts` (`lostReasons`) | |
| BR-026 | Funnel slices have a minimum width of 24% so empty stages remain visible. | `src/lib/funnel.ts` (`funnelWidths`) | |
| BR-027 | Public site form creates a lead with `origin=site`, `lead_type=comercial`, `status=novo`, `source_detail` default `landing_page`, no `user_id`. | `src/hooks/useSiteLead.ts` | Allowed by policy "Anon site leads insert" (`supabase/migrations/20260630120000_site_leads_anon_insert.sql`: anon insert only when `origin = 'site'` and `user_id IS NULL`). Leads with null `user_id` are visible to every authenticated user. Test: `src/test/leadCapture.test.tsx`. |
| BR-028 | Deleting a record that has dependents shows a specific Portuguese message for `leads`, `proposals`, `projects`, `suppliers`, else a generic one (SQLSTATE `23503`). | `src/lib/handleDeleteError.ts` | |

## Partners

| ID | Rule | Where | Notes |
|---|---|---|---|
| BR-029 | Partners are leads with `lead_type=parceiro` and a `partner_stage`: `novo`, `primeira_conversa`, `parceria_ativa`, `trouxe_indicacao`, `fidelizado`, `inativo`. Active partners are `parceria_ativa`, `trouxe_indicacao`, `fidelizado`. | `src/hooks/useLeads.ts` (`PARTNER_STAGES`, `ACTIVE_PARTNER_STAGES`) | |
| BR-030 | A lead may reference a referring partner. The reference is valid only on commercial leads, never to itself, and the target must be a partner. | `supabase/migrations/20260826150200_add_lead_referred_by_partner.sql` (`validate_lead_referral`) | DB trigger. |

## Proposals and contracts

| ID | Rule | Where | Notes |
|---|---|---|---|
| BR-031 | Proposal statuses: `rascunho` -> `enviada` (sets `sent_at`) -> `aprovada` (sets `approved_at`) or `rejeitada`. | `src/pages/LeadsProposals.tsx` | Rejection asks a reason (`rejection_reason`). |
| BR-032 | Approving a proposal opens a dialog to convert it to a contract. | `src/pages/LeadsProposals.tsx`, `src/pages/LeadDetail.tsx` | |
| BR-033 | Proposal to contract: number `CONTR-<year>-<NNN>` where NNN = count of this year's contracts loaded in the page + 1. Contract starts as `rascunho`, copies value, conditions, scope, duration, client data, environments, area. A pending revenue payment with no project and supplier "Receita Escritório" is created. The lead is converted to client if not yet (BR-019). | `src/pages/LeadDetail.tsx` | The count uses the loaded list, so it can repeat a number (see [open-questions.md](../open-questions.md)). Revenue may be double counted with BR-019 "Honorários". |
| BR-034 | Contract statuses: `rascunho`, `enviado`, `assinado`, `cancelado`. | `src/pages/LeadsContracts.tsx` | A signed contract with a `project_id` links to the project. |
| BR-035 | Proposal PDF blocks have fixed keys. The saved `proposal_blocks` rows hold only differences from defaults. Reading always merges with defaults, so an empty table yields the standard PDF. | `src/lib/proposalBlocks.ts` (`BLOCK_DEFAULTS`, `PROPOSAL_BLOCK_KEYS`) | Tests: `src/test/proposalBlocks.test.ts`, `src/test/proposalBlocksEditor.test.tsx`. |
| BR-036 | Custom blocks have keys `custom-<type>-<id>`, types `financial`, `timeline`, `cards`. Each proposal chooses which to include (`proposals.custom_block_keys`). With "include by default" the block is checked on new proposals and included in old proposals that have no saved choice. | `src/lib/proposalCustomBlocks.ts` (`includeCustomBlock`) | Test: `src/test/proposalCustomBlocks.test.tsx`. |
| BR-037 | Financial custom block parses Brazilian numbers and totals columns. | `src/lib/proposalCustomBlocks.ts` (`parseBRNumber`, `columnTotals`) | |
| BR-038 | Flow step keys are stable and map to timeline fields through `FLOW_STEP_TIMELINE`. | `src/lib/proposalBlocks.ts` | |
| BR-039 | A project without a client suggests the client whose name (at least 3 characters, accent and case insensitive) appears inside the project name. With several matches the longest name wins. | `src/lib/clientSuggestion.ts` (`suggestClient`) | Test: `src/test/linkClientNotice.test.tsx` (inferred relation). |

## Project code

| ID | Rule | Where | Notes |
|---|---|---|---|
| BR-040 | Automatic project code is `Q<n>` where n = highest existing `Q<number>` + 1, never below 145 (`PROJECT_NUMBER_FLOOR` = 144). | `src/lib/projectNumber.ts` (`suggestNextProjectNumber`) | Test: `src/test/projectNumber.test.tsx`. |
| BR-041 | The code can be edited by hand. Legacy formats are accepted (`Q12`, `2019-03`, `P-034`). Codes are normalized to trimmed, single-spaced, upper case. A duplicate is not blocked by the database; the form warns and asks confirmation. | `src/lib/projectNumber.ts` (`normalizeProjectNumber`, `findProjectsWithCode`, `DuplicateProjectNumberError`) | Test: `src/test/projectNumber.test.tsx`. |
