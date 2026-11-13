# Business rules: finance

Last verified: 2026-11-08, commit 4ad4101 (branch main) plus uncommitted working tree.

Related tests: only the installment builder (`src/test/cotacaoInstallments.test.ts`) is tested. `useFinanceiroMetrics` and `Lancamentos` have no test.

| ID | Rule | Where | Conditions and exceptions |
|---|---|---|---|
| BR-078 | Payment status enum is `pendente`, `notificado`, `pago`, `atrasado`. | `supabase/migrations/20260206155922_*.sql` (`payment_status`) | The UI and metrics also use `cancelado`, which is not in the enum (see [open-questions.md](../open-questions.md)). |
| BR-079 | A payment has `source` `escritorio` (office) or `obra` (project), default `obra`. | `supabase/migrations/20260401160930_*.sql` | |
| BR-080 | `payment_type` is `receita` or `despesa`. Column default is `despesa`, not null. The form in Lancamentos sets it explicitly. Revenue rows get supplier name "Receita Escritório"; expense rows use description or category as supplier name. | `supabase/migrations/20260410122315_*.sql`, `src/pages/Lancamentos.tsx` | Payments inserted elsewhere without `payment_type` (lead conversion, installments) take the default `despesa`. |
| BR-081 | Installments from an approved quote scenario: count at least 1; value = total / count rounded to cents (the rounding remainder is not redistributed); due dates start at the chosen date and step weekly (7 days), biweekly (15 days) or monthly (30 days, default for any other value). Description `Parcela i/n — Obra`, status `pendente`, source `cotacao`. | `src/lib/cotacaoInstallments.ts` (`buildCotacaoInstallments`) | Test: `src/test/cotacaoInstallments.test.ts`. |
| BR-082 | Approval is guarded three ways: a synchronous single-flight lock in the UI (`createSingleFlight`), a database check for existing `cotacao` payments of the project, and a unique index on `(project_id, installment_number)` where `source = 'cotacao'`. | `src/components/projects/ProjectScenariosTab.tsx`, `supabase/migrations/20261104120000_payments_cotacao_unique_installments.sql` | |
| BR-083 | Revenue is the sum of payments with status `pago` that are revenue and whose `paid_date` falls in the period. Expense is the sum of paid office expenses (`source=escritorio`, or no source and no project) in the period. Cancelled payments are excluded. | `src/hooks/useFinanceiroMetrics.ts` | Period is `yyyy-MM`, `yyyy` or `all`. |
| BR-084 | Classification fallback: expense if `payment_type=despesa`, or (no type and supplier is not "Receita Escritório"). Revenue if `payment_type=receita`, or (no type and no supplier or supplier is "Receita Escritório"). | `src/hooks/useFinanceiroMetrics.ts` | Because the column is never null, only the `payment_type` branches apply in practice (inferred). The code comment says the type is never saved by the UI, which is outdated. |
| BR-085 | Estimated tax = revenue times `settings.tax_rate_percent` (default 6). Net result = revenue - expense - tax. Net margin = rounded net / revenue, 0 when no revenue. | `src/hooks/useFinanceiroMetrics.ts`, `supabase/migrations/20260410122315_*.sql` | Rate edited in `src/pages/SettingsPage.tsx`. |
| BR-086 | Variation versus previous period (month or year) = rounded percent change, 0 when previous is 0. | `src/hooks/useFinanceiroMetrics.ts` | No previous period for `all`. |
| BR-087 | "Contracted revenue" = sum of approved proposals (`price_full`, else `final_value`) whose `approved_at` is in the period. | `src/hooks/useFinanceiroMetrics.ts` | |
| BR-088 | "To receive in 30 days" = pending revenue due from today to +30 days. "Overdue" = pending or `atrasado` revenue due before today. Next receipts = four earliest pending revenue items from today. | `src/hooks/useFinanceiroMetrics.ts` | |
| BR-089 | Expense category is inferred from text: Equipe, Prestadores, Administrativo, Treinamentos, Equipamentos, Assinaturas by keyword regex on description and supplier; else first word of supplier; else Outros. Charts show the top six by realized plus planned. | `src/hooks/useFinanceiroMetrics.ts` (`inferExpenseCategory`) | |
| BR-090 | Series: six months ending at the selected period, twelve months profit history, six-month projection from pending items (by due date). | `src/hooks/useFinanceiroMetrics.ts` | |
| BR-091 | NF export produces a real `.xlsx` (SheetJS), numeric values, one sheet per type. | `src/lib/nfExport.ts` (`exportNFsToXlsx`) | |
| BR-092 | Pending NF count on the dashboard = `invoices_nf` rows with status `pendente`. | `src/hooks/useFinanceiroMetrics.ts` | |
