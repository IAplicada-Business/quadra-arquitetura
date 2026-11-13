# Business rules: access and users

Last verified: 2026-11-08, commit 4ad4101 (branch main) plus uncommitted working tree.

Related tests: none found for these rules (no test covers `usePermissions`, `pagePermissions` or the user edge functions).

| ID | Rule | Where | Conditions and exceptions |
|---|---|---|---|
| BR-001 | Staff routes need a session. Without one the user goes to `/login`. | `src/App.tsx` (`ProtectedRoute`) | While `loading` is true a spinner shows. |
| BR-002 | Roles are `admin`, `moderator`, `user`. Admin means a row in `user_roles` with role `admin`. | `supabase/migrations/20260206155922_*.sql` (`app_role`, `has_role`), `src/hooks/usePermissions.ts` | `moderator` has no special behavior in the front end code read. |
| BR-003 | Admin sees every screen. A non-admin with no `user_permissions` rows also sees every screen. A non-admin with rows sees only pages with `can_view`. | `src/hooks/usePermissions.ts` (`usePermissions`) | `canEdit` follows the same logic with `can_edit`. `canEdit` is exposed but no use was verified in pages (see [open-questions.md](../open-questions.md)). |
| BR-004 | A restricted user typing a blocked URL is redirected to the first allowed screen. If none exists, an "Acesso restrito" message shows. | `src/components/layout/PermissionGate.tsx`, `src/lib/pagePermissions.ts` (`firstAllowedUrl`) | While permissions load nothing renders. |
| BR-005 | A path maps to a page key by longest matching prefix. Unmapped paths are never blocked (for example `/notifications`, `/buddy/bug`). | `src/lib/pagePermissions.ts` (`resolvePageKey`) | `/leads/` generic key `leads_pipeline` is overridden by `/leads/proposals` and `/leads/contracts`. |
| BR-006 | The sidebar hides items the user cannot view. | `src/components/layout/AppSidebar.tsx` | Menu groups come from `PAGE_GROUPS` keys. |
| BR-007 | Only an admin can create users. Required fields: `email`, `password`, `full_name`, `role` in (`admin`,`moderator`,`user`). The user is created with email already confirmed. | `supabase/functions/create-user/index.ts` | 401 without a valid token, 403 for non-admin, 400 for bad input. |
| BR-008 | Creating a user whose email already exists repairs the account: upserts profile, role and team membership, and returns `repaired: true`. | `supabase/functions/create-user/index.ts` | Looks through at most 10 pages of 200 users. |
| BR-009 | A new user joins the creator's team. If the creator has no team, a new team id is generated and the creator is added as `admin`. Team role is `admin` for role admin, else `member`. | `supabase/functions/create-user/index.ts` | Upserts are idempotent. |
| BR-010 | An admin can delete another user, never their own account. Deletion removes `user_permissions`, `user_roles`, `team_members`, `profiles`, then the auth user. | `supabase/functions/delete-user/index.ts` | Cleanup steps ignore their own errors. Other tables holding the user id are not cleaned here. |
| BR-011 | A profile row is created for every new auth user (`full_name` from metadata, else email). | `supabase/migrations/20260206155922_*.sql` (`handle_new_user`, trigger `on_auth_user_created`) | |
| BR-012 | Team-wide visibility: SELECT, UPDATE and DELETE on most tables allow rows whose `user_id` is in `get_team_user_ids()`. INSERT requires `auth.uid() = user_id`. | `supabase/migrations/20260327175547_*.sql` and later `Team can ...` policies | Some tables differ (public inserts, see [data-model.md](../data-model.md)). |
| BR-013 | Page keys (screen groups): `dashboard_escritorio`, `dashboard_obras`, `financeiro_dashboard`, `financeiro_lancamentos`, `financeiro_nf`, `construction_tasks`, `leads_pipeline`, `partners_pipeline`, `leads_proposals`, `leads_contracts`, `clients`, `projects`, `construction_tracking`, `construction_suppliers`, `construction_documents`, `construction_reports`, `content_calendar`, `content_scripts`, `content_posts`, `content_instagram`, `admin_settings`, `admin_users`. | `src/lib/pagePermissions.ts` (`PAGE_GROUPS`) | Stored in `user_permissions.page_key`. |
| BR-014 | `/admin` (publishing entry) allows administrators or users who can view `admin_settings`. Data protection relies on RLS of `site_content` and `blog_posts`. | `src/pages/AdminPublicar.tsx` | Screen layer only. |
| BR-015 | The "Buddy" board is open to every authenticated user. Moving a card is admin only (DB trigger). | `src/App.tsx` comment, `supabase/migrations/20260915163213_buddy_oportunidades.sql` | See BR-152. |
