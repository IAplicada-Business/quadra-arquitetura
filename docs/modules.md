# Modules

Last verified: 2026-11-13, commit ece07d4 (branch fix/orcamentos-escopo-manual-fornecedor) plus uncommitted working tree.

There is one deployable front end and one Supabase backend. "Modules" below are functional areas. The repo has no package boundaries, so the import rules are conventions seen in the code.

## Global import rules

- `src/lib/*` stays free of React. A few files use Supabase or toasts (exceptions below). Prefer pure functions so they can be unit tested.
- Pages import hooks and components. Components import hooks and `lib`. `lib` never imports pages or components.
- Use the alias `@/` for `src/` (`vite.config.ts`, `tsconfig.app.json`).
- Do not edit `src/integrations/supabase/client.ts` or `previewAuthStorage.ts` (marked auto-generated). `types.ts` is generated and is stale (see [open-questions.md](open-questions.md)).
- `src/components/ui/*` are shadcn primitives (`components.json`). Add variants there, not feature logic.
- `lib` files that import Supabase or toasts: `src/lib/mediaUpload.ts`, `src/lib/handleDeleteError.ts`, `src/lib/oportunidades.functions.ts`, `src/lib/prerequisiteTasks.ts` (`createPrerequisiteTasks`).

## Module map

| # | Module | Responsibility |
|---|---|---|
| 1 | App shell and routing | Routes, layout, sidebar, header, PWA |
| 2 | Auth and permissions | Login, roles, per-screen access, user admin |
| 3 | Supabase integration | Client, types, storage helpers |
| 4 | Commercial CRM | Leads, partners, clients, proposals, contracts |
| 5 | Projects (obras) | Project list, detail tabs, kanban by status |
| 6 | Schedule engine | Business-day calendar, reverse schedule, critical path, checkpoints |
| 7 | Budget and purchases | Scope, quotes, budget import, cotação approval, materials, suppliers |
| 8 | Site tracking and reports | Site diary, visits, weekly reports, checklist |
| 9 | Finance | Entries, financial dashboard, invoices (NF) |
| 10 | Dashboards | Commercial and projects dashboards, multi-project view |
| 11 | Tasks | Kanban, audio tasks, voice agent |
| 12 | Client portal | Public token portal, onboarding, live updates |
| 13 | Content management | Calendar, scripts, posts, Instagram |
| 14 | Public site and blog | Landing, blog, editable site content |
| 15 | Settings | Calculation rules, channels, templates, proposal blocks, site, blog |
| 16 | Buddy board | Bug and improvement board ("Banco de Oportunidades") |
| 17 | AI assistants | Chat box and AI edge functions |
| 18 | Notifications | In-app notifications and the sweep function |
| 19 | Shared UI and utilities | shadcn, visual widgets, helpers |
| 20 | Supabase backend | Migrations, edge functions, config |

## 1. App shell and routing

- Purpose: route table, protected area, layout.
- Public interface: `src/App.tsx` (`App`, `ProtectedRoute`), `src/main.tsx`.
- Structure: `src/components/layout/` (`AppLayout`, `AppSidebar`, `AppHeader`, `PermissionGate`, `NotificationsPanel`, `InstallPwaButton`, `VoiceAgentDialog`, `PageTitle`), `src/components/NavLink.tsx`, `src/components/PlaceholderPage.tsx`.
- Depends on: Auth (module 2), TanStack Query, react-router-dom.
- Used by: all pages.
- Owned files: `index.html`, `vite.config.ts` (PWA config), `public/`.
- Rules: new staff routes go inside the `ProtectedRoute` + `AppLayout` group. A route that needs access control must also be mapped in `src/lib/pagePermissions.ts`. Add redirects for renamed routes, like the existing "compatibility" block.

Route groups (all in `src/App.tsx`):

| Group | Paths |
|---|---|
| Public | `/`, `/blog`, `/blog/:slug`, `/admin`, `/login`, `/esqueci-senha`, `/redefinir-senha`, `/client/:token` |
| Analytics | `/dashboard/escritorio`, `/dashboard/financeiro`, `/dashboard/obras` |
| Commercial | `/leads/pipeline`, `/leads/:id`, `/leads/proposals`, `/leads/contracts`, `/partners/pipeline`, `/partners/:id`, `/clients` |
| Projects | `/projects`, `/projects/kanban`, `/projects/:id`, `/construction/tracking`, `/construction/suppliers`, `/construction/documents`, `/construction/reports` |
| Tasks | `/tasks/projetos`, `/tasks/quadra`, `/construction/voice-tasks` |
| Finance | `/financeiro/lancamentos`, `/admin/invoices` |
| Content | `/content/calendar`, `/content/scripts`, `/content/posts`, `/content/instagram` |
| Admin | `/admin/settings`, `/admin/users`, `/notifications`, `/buddy/bug` |
| Redirects | `/dashboard`, `/tasks`, `/construction/tasks`, `/construction/agenda`, `/site-tracking`, `/suppliers`, `/documents`, `/reports`, `/settings`, `/budgets`, `/purchases`, `/financial` |

Note: no link to `/projects/kanban` exists in `src/` (see [open-questions.md](open-questions.md)).

## 2. Auth and permissions

- Purpose: authentication, roles, screen access, user administration.
- Interface: `useAuth` (`src/contexts/AuthContext.tsx`: `session`, `user`, `loading`, `signIn`, `signUp`, `signOut`), `usePermissions` (`src/hooks/usePermissions.ts`), `PAGE_GROUPS`, `resolvePageKey`, `firstAllowedUrl` (`src/lib/pagePermissions.ts`), `PermissionGate`.
- Structure: pages `src/pages/Login.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `AdminUsersPage.tsx`, `AdminPublicar.tsx`; `src/components/auth/` (`AuthShell`, `AuthBlobs`); edge functions `create-user`, `delete-user`.
- Depends on: Supabase Auth, tables `user_roles`, `user_permissions`, `team_members`, `profiles`.
- Rules: [business-rules/access.md](business-rules/access.md). `src/lib/pagePermissions.ts` is the single source for page keys (used by sidebar, user admin and gate).

## 3. Supabase integration

- Files: `src/integrations/supabase/client.ts` (`supabase`), `previewAuthStorage.ts` (`brokeredPreviewStorage`), `types.ts` (generated `Database`).
- `previewAuthStorage.ts` shares the auth session with the Lovable editor over `postMessage` on Lovable preview hosts. Elsewhere it returns `localStorage`.
- Helpers: `src/lib/mediaUpload.ts` (`uploadImage`, `uploadRawFile`, `describeUploadError`), `src/lib/imageResize.ts` (`resizeImage`, `detectImageType`), `src/lib/edgeFunctionError.ts` (`edgeFunctionErrorMessage`), `src/lib/handleDeleteError.ts`, `src/lib/sanitizePayload.ts` (`sanitizeEmptyStrings`).
- Rule: pass optional date fields through `sanitizeEmptyStrings` to avoid SQLSTATE `22007` errors from empty strings.

## 4. Commercial CRM

- Purpose: capture and qualify leads, track partners who refer leads, manage clients, proposals and contracts.
- Pages: `LeadsPipeline`, `LeadDetail`, `PartnersPipeline`, `PartnerDetail`, `Clients`, `LeadsProposals`, `LeadsContracts`.
- Hooks: `useLeads`, `usePartnerMetrics`, `usePartnerReferrals`, `useAcquisitionChannels`, `useChannelMetrics`, `useProposals`, `useProposalTemplates`, `useProposalAssets`, `useProposalBlocks`, `useContracts`, `useContractTemplates`, `useSiteLead`.
- Components: `src/components/leads/` (forms, previews, `proposal-pages/*` PDF pages, `contract-pages/*`), `src/components/landing/LeadCaptureDialog.tsx`.
- Logic: `src/lib/proposalBlocks.ts`, `proposalCustomBlocks.ts`, `generateProposalPdf.ts`, `generateContractPdf.ts`, `src/data/defaultContractClauses.ts`, `src/lib/clientSuggestion.ts`, `projectNumber.ts`.
- Edge function: `generate-proposal` (text suggestion; no caller found in `src/`).
- Rules: [business-rules/commercial.md](business-rules/commercial.md).

## 5. Projects (obras)

- Pages: `Projects`, `ProjectsKanban`, `ProjectDetail` (tabs `resumo`, `escopo`, `orcamentos`, `materiais`, `cronograma`, `financeiro`, `documentos`, `acompanhamento`, `onboarding`).
- Components: `src/components/projects/*` (one `Project*Tab` per tab, forms, dialogs, Gantt, tables).
- Hooks: `useProjectDetail`, `useProjectNumbers`, `useProjectDisciplines`, `useDefaultDisciplines`, `useProjectPayments`, `useProjectPurchases`, `usePendingItems`, `useDocumentMeta`.
- Constants: `src/lib/projectConstants.ts` (`PROJECT_STATUSES`, `subStatusOptions`).
- Rules: [business-rules/projects.md](business-rules/projects.md).

## 6. Schedule engine

- Purpose: compute dates in Brazilian business days, derive timeline metrics, cascade changes, create checkpoints and prerequisite tasks.
- Pure files: `src/lib/businessCalendar.ts`, `reverseSchedule.ts`, `criticalPath.ts`, `prerequisiteTasks.ts`, `deliveryChecklist.ts`.
- Hooks: `useProjectActivities` (`computeCascade`, `computeRecalculateAll`, `resolveDonePatch`, `ACTIVITY_TO_TASK_STATUS`), `useScheduleTasks`, `useScheduleScenarios`, `useActivityTemplates`, `useDeliveryChecklist`, `useClientClosingSchedule`.
- Components: `GanttChart`, `ReverseScheduleTable`, `CascadePreviewDialog`, `ScheduleScenariosDialog`, `GenerateActivitiesDialog`, `ApplyCalendarDialog`, `ActivityDeliveryChecklist`.
- Edge functions: `generate-activities`, `analyze-plant`, `generate-checkpoints`, `project-ai-assistant` (actions `sequence`, `generate_schedule`).
- Rules: [business-rules/projects.md](business-rules/projects.md). Imported by the portal (`src/lib/portalSchedule.ts` uses `reverseSchedule`).

## 7. Budget and purchases

- Files: `src/lib/budgetImport.ts`, `supplierScopeQuotes.ts`, `cotacaoInstallments.ts`, `disciplineAccounts.ts`, `disciplineColors.ts`; hooks `useBudgetQuotes`, `useBudgetImport`, `useBudgetDisciplineSuppliers`, `useScopeItems`, `useSupplierScopes`, `useSupplierAllocations`, `usePurchaseCategories`, `useProjectPurchases`, `useMaterialCalc`, `useMaterialTracking`, `useMaterialIndices`, `useLaborCosts`, `useCostReferenceTable`, `useCalculationRules`, `useCalculationParameters`, `usePriceResearch`, `useScenarios`.
- Pages: `Suppliers`. Components: `BudgetQuoteTable`, `BudgetQuoteForm`, `BudgetEstimator`, `ProjectScenariosTab`, `ProjectPurchasesTab`, `ShoppingListDialog`, `PriceSearchDialog`, `SupplierScopeDialog`, `src/components/construction/Supplier*`.
- Edge functions: `search-prices-bh`, `project-ai-assistant` (`analyze_budget`, `estimate_costs`, `generate_materials`).
- Rules: [business-rules/projects.md](business-rules/projects.md) and [business-rules/finance.md](business-rules/finance.md).

## 8. Site tracking and reports

- Pages: `SiteTracking`, `Documents`, `Reports`. Hooks: `useSiteDiary`, `useSiteVisits`, `useWeeklyReports`, `useProjectOnboarding`, `usePendingItems`.
- Components: `ProjectTrackingTab`, `WeeklyReportModal`, `WeeklyReportsSection`, `src/components/reports/*`, `ChecklistItemPhotos`.
- Logic: `src/lib/weeklyReport.ts`, `weeklyAIContext.ts`, `generateWeeklyReportPdf.ts`.
- Rules: [business-rules/projects.md](business-rules/projects.md).

## 9. Finance

- Pages: `Lancamentos`, `DashboardFinanceiro`, `InvoicesPage`. Hooks: `useFinanceiroMetrics`, `useInvoices`, `useInvoicesNF`. Components: `InvoiceForm`, `InvoiceNFForm`, `InvoiceNFList`, `PaymentForm`, `ProjectFinancialTab`, `src/components/reports/AccountingReport.tsx`.
- Logic: `src/lib/nfExport.ts` (`exportNFsToXlsx`), `src/lib/csv.ts`.
- Rules: [business-rules/finance.md](business-rules/finance.md).

## 10. Dashboards

- Pages: `DashboardEscritorio`, `DashboardObras`, `DashboardFinanceiro`. Hooks: `useComercialMetrics`, `useFinanceiroMetrics`, `usePartnerMetrics`, `useChannelMetrics`.
- Components: `src/components/dashboard/` (`FunnelChart`, `MonthlyStackedChart`, `MultiObrasView`). Logic: `src/lib/funnel.ts`, `multiObras.ts`, `monthRange.ts`, `chartColors.ts`.
- Rules: [business-rules/commercial.md](business-rules/commercial.md), [business-rules/projects.md](business-rules/projects.md), [business-rules/finance.md](business-rules/finance.md).

## 11. Tasks

- Pages: `TasksHub` (modes `projects` and `quadra`), `VoiceTasksPage`. Hooks: `useVoiceTasks`, `useVoiceInput`. Components: `VoiceAgentDialog`, `src/components/construction/VoiceTaskForm.tsx`, `ConstructionTaskForm`, `ImportPlantDialog`, `src/components/ui/voice-input-button.tsx`.
- Edge function: `process-voice-command`.
- Table: `voice_tasks` (also written by `check-notifications`).

## 12. Client portal

- Page: `ClientPortal` at `/client/:token`. Components: `src/components/portal/*` (shell, screens `Inicio`, `Pendencias`, `Galeria`, `Orcamento`, `Analise`, `Prestacao`, `Cronograma`, `Compras`, `Resumos`, `Etapa`), `src/components/onboarding/*`.
- Logic: `src/lib/portal.ts`, `portalTrail.ts`, `portalSchedule.ts`, `portalScenarios.ts`, `portalCompras.ts`, `portalUrl.ts`, `onboarding.ts`, `closingStatus.ts`.
- Hooks: `useLivePortalData`, `useClientPortalToken`, `useOnboardingTemplate`, `useProjectOnboarding`.
- Edge functions: `get-client-portal-data`, `submit-client-response`. SQL: `rotate_client_portal_token`, `notify_client_portal_change`.
- Rule: portal logic stays pure and takes `PortalData` (`src/lib/portal.ts`). Do not add staff-only fields to the edge function payload.
- Rules: [business-rules/portal.md](business-rules/portal.md).

## 13. Content management

- Pages: `ContentCalendar`, `ContentScripts`, `ContentPosts`, `ContentInstagram`. `ContentPlaceholder` exists but is not imported anywhere (dead code candidate).
- Hooks: `useContentCalendar`, `useContentPosts`, `useContentSeries`, `useInstagramAnalysis`, `useInstagramInspirations`. Components: `src/components/content/*`.
- Edge function: `content-ai-assistant` (actions `generate_script`, `suggest_ideas`, `generate_hashtags`, `rewrite_hook`).
- Tables: `content_posts`, `content_series`, `instagram_inspirations`, `instagram_profiles`, `instagram_metrics`.

## 14. Public site and blog

- Pages: `Landing`, `Blog`, `BlogPost`. Components: `src/components/landing/*`, `src/components/blog/*`. Hooks: `useSiteContent`, `useBlog`, `useSiteLead`, `useDocumentMeta`.
- Logic: `src/lib/siteContent.ts` (defaults and field definitions), `src/lib/blog.ts`, `src/lib/motion.ts`. Assets: `src/assets/`.
- Rules: [business-rules/content-site.md](business-rules/content-site.md).

## 15. Settings

- Page: `SettingsPage` (tabs `geral`, `regras`, `canais`, `conteudo`, `proposta`, `onboarding`, `site`, `blog`). Components: `src/components/settings/*`.
- Tables: `settings` (includes `tax_rate_percent`), `calculation_rules`, `acquisition_channels`, `message_templates`, `proposal_blocks`, `onboarding_templates`, `site_content`, `blog_posts`.

## 16. Buddy board

- Page: `BuddyBug` (route `/buddy/bug`, 2158 lines). Logic: `src/lib/oportunidades.functions.ts`, `src/lib/oportunidades-aprovacao-reminder.ts`. Components: `src/components/buddy/BuddyMenu.tsx`, `DocsProjetoMenu.tsx`, `src/components/oportunidades-dashboard.tsx`, `oportunidades-aprovacao-reminder.tsx`.
- Tables: `oportunidades`, `oportunidade_comentarios`, `oportunidade_historico`, `oportunidade_votos`, `oportunidade_anexos`; bucket `oportunidade-anexos`; RPC `recusar_entrega_oportunidade`.
- Rules: [business-rules/content-site.md](business-rules/content-site.md) (section Buddy board).

## 17. AI assistants

- Chat: `src/components/chat/AIChatBox.tsx`, `src/hooks/useAIChat.ts`, edge function `chat-assistant`. Project actions: `src/hooks/useProjectAI.ts`, edge function `project-ai-assistant`.
- Other AI functions: `analyze-plant`, `generate-activities`, `generate-memorial`, `generate-proposal`, `search-prices-bh`, `process-voice-command`, `content-ai-assistant`.
- Details: [api.md](api.md), [business-rules/automation-ai.md](business-rules/automation-ai.md).

## 18. Notifications

- Hook `useNotifications`, panel `NotificationsPanel`, page `NotificationsPage`, table `notifications`, edge function `check-notifications`, trigger function `notify_new_lead`.

## 19. Shared UI and utilities

- `src/components/ui/` (52 files: shadcn plus `ia-siri-chat.tsx`, `section-tabs.tsx`, `voice-input-button.tsx`), `src/components/visual/` (`InfoHint`, `KanbanLayout`, `PageSkeleton`, `ProgressRing`, `ShowMore`, `Sparkline`, `StatusPill`), `src/components/ConfirmDeleteDialog.tsx`, `src/lib/utils.ts` (`cn`), `src/lib/csv.ts`, `src/hooks/use-toast.ts`, `use-mobile.tsx`.
- Details: [design-system.md](design-system.md).

## 20. Supabase backend

- `supabase/config.toml`, `supabase/migrations/` (126 files), `supabase/functions/` (16 functions).
- Details: [data-model.md](data-model.md), [api.md](api.md), [configuration.md](configuration.md).
