# Testing

Last verified: 2026-11-08, commit 4ad4101 (branch main) plus uncommitted working tree.

## Setup

- Runner: Vitest 3 (`vitest.config.ts`): environment `jsdom`, `globals: true`, setup file `src/test/setup.ts`, pattern `src/**/*.{test,spec}.{ts,tsx}`.
- Libraries: `@testing-library/react`, `@testing-library/dom`, `@testing-library/jest-dom`.
- `src/test/setup.ts` stubs `matchMedia`, `ResizeObserver` and `IntersectionObserver` (needed by Radix and framer-motion).
- Commands: `npm test` (single run), `npm run test:watch`.
- Last run (2026-11-08): 75 files, 702 tests, all passed, about 113 s.
- No CI workflow runs the tests. No coverage tooling is configured. No end-to-end tests exist.

## Map of tests

| Area | Files in `src/test/` | Code under test |
|---|---|---|
| Calendar and schedule | `businessCalendar.test.ts`, `reverseSchedule.test.ts`, `q153.test.ts`, `criticalPath.test.ts`, `reverseScheduleTable.test.tsx`, `cronogramaTabelas.test.tsx`, `resolveDonePatch.test.ts`, `prerequisiteTasks.test.ts` | `src/lib/businessCalendar.ts`, `reverseSchedule.ts`, `criticalPath.ts`, `prerequisiteTasks.ts`, `useProjectActivities.ts` |
| Budget and accounts | `budgetImport.test.ts`, `budgetQuoteTable.test.tsx`, `budgetQuoteDiscipline.test.tsx`, `supplierScopeQuotes.test.ts`, `supplierScopeDialog.test.tsx`, `disciplineAccounts.test.ts`, `disciplinePieChart.test.tsx`, `cotacaoInstallments.test.ts` | matching `src/lib` files and components |
| Commercial | `funnel.test.tsx`, `leadsPipelinePage.test.tsx`, `leadCapture.test.tsx`, `projectNumber.test.tsx`, `linkClientNotice.test.tsx`, `monthRange.test.ts`, `proposalBlocks.test.ts`, `proposalBlocksEditor.test.tsx`, `proposalCustomBlocks.test.tsx`, `proposalPageRenderer.test.tsx` | `src/lib/funnel.ts`, `projectNumber.ts`, proposal libs, pages |
| Portal and onboarding | `portal.test.ts`, `portalTrail.test.ts`, `portalSchedule.test.ts`, `portalScenarios.test.ts`, `portalCompras.test.ts`, `portalUrl.test.ts`, `portalLinkDialog.test.tsx`, `clientPortal.test.tsx`, `useClientPortalToken.test.tsx`, `inicioEtapas.test.tsx`, `etapaScreen.test.tsx`, `comprasScreen.test.tsx`, `orcamentoAnaliseScreens.test.tsx`, `prestacaoScreen.test.tsx`, `clientCountdownList.test.tsx`, `closingPendings.test.tsx`, `onboarding.test.ts`, `onboardingEditor.test.tsx`, `onboardingTabs.test.tsx` | `src/lib/portal*.ts`, `onboarding.ts`, portal components |
| Tracking | `weeklyReport.test.ts`, `weeklyAIContext.test.ts`, `weeklyReportsUI.test.tsx`, `trackingWeeklyReport.test.tsx`, `deliveryChecklist.test.ts`, `checklistPhotos.test.tsx`, `multiObras.test.ts` | matching files |
| Site and blog | `siteContent.test.ts`, `siteContentTab.test.tsx`, `landingSiteContent.test.tsx`, `landingSections.test.tsx`, `landingEfeitos.test.tsx`, `motion.test.tsx`, `blog.test.ts`, `blogPages.test.tsx`, `blogPostsTab.test.tsx`, `adminPublicar.test.tsx`, `siteImageUpload.test.ts`, `mediaUpload.test.ts` | `src/lib/siteContent.ts`, `blog.ts`, landing and blog components |
| Buddy board | `oportunidades.functions.test.ts`, `oportunidades-aprovacao-reminder.test.ts`, `buddyMenus.test.tsx` | `src/lib/oportunidades*.ts`, buddy components |
| Shared | `sanitizePayload.test.ts`, `edgeFunctionError.test.ts`, `confirmDeleteDialog.test.tsx`, `showMore.test.tsx`, `visualComponents.test.tsx`, `authScreens.test.tsx`, `headerPerfilMenu.test.tsx`, `example.test.ts` | helpers and UI |

## Gaps (no test found)

- Edge functions (`supabase/functions/*`), including user management and the notification sweep.
- SQL: RLS, triggers, RPCs.
- `usePermissions`, `pagePermissions`, `PermissionGate`.
- `useFinanceiroMetrics`, `Lancamentos`, `convertToClient` in `useLeads`, `computeCascade`, `computeRecalculateAll` (only indirectly, inferred).
- PDF builders and `nfExport`.

## How to write tests

- Put the file in `src/test/` named `<subject>.test.ts` (logic) or `.test.tsx` (components).
- Prefer testing pure functions in `src/lib/`. Pass `today` or `now` as an argument instead of mocking the clock (the libs accept it).
- Mock `@/integrations/supabase/client` when a component needs it. Existing tests show the pattern.
- Run `npm test` before opening a pull request.
