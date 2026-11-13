# Logic flows

Last verified: 2026-11-13, commit d629e0b (branch feat/sync-5s-aprovacao-cenarios-cliente) plus uncommitted working tree.

## 1. Sign-in and screen access

```mermaid
sequenceDiagram
  participant U as User
  participant A as AuthProvider
  participant P as usePermissions
  participant G as PermissionGate
  U->>A: signIn(email, password)
  A-->>U: session (onAuthStateChange)
  U->>G: open a staff route
  G->>P: load user_roles and user_permissions
  alt admin or no permission rows
    P-->>G: canViewPath = true
  else restricted
    P-->>G: only pages with can_view
    G-->>U: redirect to first allowed page, or "Acesso restrito"
  end
```

Rules: BR-001 to BR-006. Files: `src/App.tsx`, `src/contexts/AuthContext.tsx`, `src/hooks/usePermissions.ts`, `src/components/layout/PermissionGate.tsx`.

## 2. Lead to client to project

```mermaid
flowchart TD
  F[Site form or manual entry] --> L[lead status novo]
  L --> C1[contato_feito] --> C2[reuniao_agendada] --> C3[proposta_enviada]
  C3 --> PR[Proposal rascunho -> enviada -> aprovada]
  PR --> CV{Convert to contract?}
  CV -- yes --> CT[Contract rascunho + revenue payment]
  C3 --> CL[fechado]
  CT --> CL
  CL --> CC[convertToClient]
  CC --> K{Client exists by email or phone?}
  K -- yes --> KU[reuse client]
  K -- no --> KN[create client]
  KU --> PJ[create project status planejamento, code Q n]
  KN --> PJ
  PJ --> PAY{approved proposal?}
  PAY -- yes --> HP[pending 'Honorários' payment]
```

Rules: BR-016 to BR-019, BR-031 to BR-033, BR-040. Files: `src/pages/LeadsPipeline.tsx`, `src/hooks/useLeads.ts` (`convertToClient`), `src/pages/LeadDetail.tsx`, `src/pages/LeadsProposals.tsx`.

## 3. Scope to schedule (AI assisted)

```mermaid
flowchart TD
  IN[Text, audio transcript or plant file] --> GA[generate-activities / analyze-plant]
  GA --> PREV[Preview dialog in GenerateActivitiesDialog]
  PREV --> SAVE[Insert project_activities with depends_on]
  SAVE --> TL[ApplyCalendarDialog and schedule scenarios: buildTimeline in business days]
  SAVE --> CASC[Edit dates: applyReverseEdit, computeCascade]
  SAVE --> CPM[computeCriticalPath]
  SAVE --> CK[ProjectScheduleTab: generate-checkpoints -> site_visits]
  SAVE --> PRE[ActivityForm: createPrerequisiteTasks -> voice_tasks (inferred table)]
```

Rules: BR-043 to BR-052, BR-057 to BR-061, BR-126, BR-128. Files: `src/components/projects/GenerateActivitiesDialog.tsx`, `src/lib/businessCalendar.ts`, `src/lib/reverseSchedule.ts`, `src/lib/prerequisiteTasks.ts`, `src/hooks/useProjectActivities.ts`.

## 4. Quote approval to payments

```mermaid
sequenceDiagram
  participant U as Staff
  participant T as ProjectScenariosTab
  participant DB as Postgres
  U->>T: Approve (count, start date, interval)
  T->>T: single-flight lock
  T->>DB: count payments where source = cotacao
  alt already exist
    T-->>U: info "already approved"
  else none
    T->>DB: insert N installments
    T->>DB: update projects cotacao_aprovada, total, date
    T-->>U: success toast
  end
  U->>T: Revise
  T->>DB: delete payments source = cotacao
  T->>DB: clear project flags
```

Rules: BR-070, BR-081, BR-082. Files: `src/components/projects/ProjectScenariosTab.tsx`, `src/lib/cotacaoInstallments.ts`.

## 5. Client portal read and answer

```mermaid
sequenceDiagram
  participant C as Client browser
  participant EF as get-client-portal-data
  participant S as submit-client-response
  participant DB as Postgres
  participant RT as Realtime
  C->>EF: POST {token}
  EF->>DB: validate token, load 13 queries (service role)
  EF-->>C: PortalData
  C->>C: portal.ts, portalTrail.ts compute views
  C->>S: POST {token, weekly_report_id, pending_item, status}
  S->>DB: validate token, check duplicate, insert answer
  S->>DB: notify each admin
  S-->>C: success (duplicate flag if repeated)
  DB->>RT: trigger sends portal_changed on team edits
  RT-->>C: reload (debounced) plus 5 s poll
```

Rules: BR-093 to BR-102. Files: `supabase/functions/get-client-portal-data/index.ts`, `supabase/functions/submit-client-response/index.ts`, `src/hooks/useLivePortalData.ts`, `src/pages/ClientPortal.tsx`.

## 6. Create a user (admin)

```mermaid
flowchart TD
  A[AdminUsersPage form] --> B[create-user]
  B --> C{caller is admin?}
  C -- no --> X[403]
  C -- yes --> D[auth.admin.createUser]
  D --> E{email exists?}
  E -- yes --> R[find user, upsert profile] --> F
  E -- no --> F[upsert user_roles]
  F --> G{caller has team?}
  G -- no --> H[create team, add caller as admin]
  G -- yes --> I
  H --> I[upsert team_members]
  I --> J[optional: save user_permissions from the page]
```

Rules: BR-007 to BR-009. Files: `src/pages/AdminUsersPage.tsx`, `supabase/functions/create-user/index.ts`.

## 7. Weekly report to client

1. Staff opens the tracking tab (`src/components/projects/ProjectTrackingTab.tsx`).
2. "Generate summary with AI" builds context with `buildWeeklyAIContext` and calls `project-ai-assistant` (`weekly_summary`).
3. The answer goes through `normalizeAISummary` into the form fields.
4. The report is saved in `weekly_reports`; `client_pending` lines become items the client answers in the portal.
5. The text is shared by WhatsApp (`buildWeeklyReportMessage`, `whatsappPhone`) or exported as PDF (`src/lib/generateWeeklyReportPdf.ts`).

Rules: BR-072 to BR-074.

## 8. Notification sweep

```mermaid
flowchart LR
  T[Caller or scheduler (not in repo)] --> F[check-notifications]
  F --> R1[8 rules query tables]
  R1 --> D{notification of same type<br/>in last 3 days?}
  D -- no --> N[insert notifications]
  N --> V[some rules also insert voice_tasks]
  N --> RT[Realtime INSERT -> bell in header]
```

Rules: BR-115 to BR-124. Files: `supabase/functions/check-notifications/index.ts`, `src/hooks/useNotifications.ts`.

## 9. Buddy card delivery

1. A card moves to `entregue` (admin only).
2. The author sees the approval reminder (BR-157) and approves, or refuses with a reason through `recusar_entrega_oportunidade`.
3. Refusal returns the card to `em_analise` and writes history.

Rules: BR-148 to BR-157. Files: `src/pages/BuddyBug.tsx`, `src/lib/oportunidades.functions.ts`.
