# Business rules: content, public site, uploads, Buddy board

Last verified: 2026-11-08, commit 4ad4101 (branch main) plus uncommitted working tree.

## Public site and blog

| ID | Rule | Where | Conditions, tests |
|---|---|---|---|
| BR-137 | Site text is defined by fixed section and field keys with defaults. Only differences are stored in `site_content`. Reading always merges with defaults, so an empty table shows the standard site. A `select` value outside its options falls back to the default. | `src/lib/siteContent.ts` (`SITE_DEFAULTS`, `SITE_SECTION_DEFINITIONS`) | Tests: `src/test/siteContent.test.ts`, `src/test/siteContentTab.test.tsx`, `src/test/landingSiteContent.test.tsx`. |
| BR-138 | File and image URLs from content are accepted only if `https://...` or a root-relative path (not `//`). Otherwise they become empty. | `src/lib/siteContent.ts` (`safeFileUrl`) | Test: `src/test/siteContent.test.ts` (inferred). |
| BR-139 | The public site reads content through the SQL function `get_public_site_content(p_team_id)`. The owning team is `VITE_SITE_TEAM_ID` or a fixed default id. | `src/hooks/useSiteContent.ts`, `src/lib/siteContent.ts` (`SITE_TEAM_ID`) | |
| BR-140 | Blog post slug must match `^[a-z0-9]+(-[a-z0-9]+)*$` (also a DB check). Generated slugs drop accents, use hyphens and are cut at 80 characters. | `src/lib/blog.ts` (`slugify`, `isValidSlug`), `supabase/migrations/20261021120000_blog_posts.sql` | Test: `src/test/blog.test.ts`. |
| BR-141 | Blog status is `draft` or `published`. A draft never shows on the site. A published post shows only when `published_at <= now()`, which allows scheduling. Publishing without a date stamps now. | `supabase/migrations/20261021120000_blog_posts.sql` (`get_public_blog_posts`, `stamp_blog_post`) | Tests: `src/test/blogPages.test.tsx`, `src/test/blogPostsTab.test.tsx`. |
| BR-142 | Reading time = characters / 1100 rounded up, minimum 1 minute. | `src/lib/blog.ts` (`readingMinutes`) | Test: `src/test/blog.test.ts`. |
| BR-143 | Site and blog editing is limited to the team's members by RLS (`get_my_team_ids()`). | `supabase/migrations/20260929180000_site_content.sql`, `20261021120000_blog_posts.sql` | |

## Uploads

| ID | Rule | Where | Conditions, tests |
|---|---|---|---|
| BR-144 | Images are resized in the browser to at most 1600 px wide (default) and recompressed at 0.85. PNG stays PNG, other types become JPEG. SVG and GIF pass untouched. HEIC is converted. | `src/lib/imageResize.ts`, `src/lib/mediaUpload.ts` (`uploadImage`) | Tests: `src/test/mediaUpload.test.ts`, `src/test/siteImageUpload.test.ts`. |
| BR-145 | Upload requires a live session and the result must be at most 10 MB (default). Storage errors map to Portuguese messages (bucket missing, no permission, too large, bad format, network). | `src/lib/mediaUpload.ts` (`requireSession`, `describeUploadError`) | Test: `src/test/mediaUpload.test.ts`. |
| BR-146 | Video upload keeps the file as is. The extension comes from the type (`mp4`, `mov`, `webm`) or the file name; without either the upload is refused. | `src/lib/mediaUpload.ts` (`uploadRawFile`) | |
| BR-147 | Buddy attachments: PNG, JPEG, WebP, GIF only, 8 MB each, at most 4 per submission. | `src/lib/oportunidades.functions.ts` (`ANEXO_TIPOS_ACEITOS`, `ANEXO_TAMANHO_MAX`, `ANEXO_MAX_POR_ENVIO`) | Test: `src/test/oportunidades.functions.test.ts`. |

## Buddy board (oportunidades)

| ID | Rule | Where | Conditions, tests |
|---|---|---|---|
| BR-148 | Card type is `bug`, `melhoria` or `duvida`. DB status values: `backlog` (default), `em_analise`, `planejado`, `em_dev`, `entregue`, `descartado`. Priority: `critica`, `alta`, `media`, `baixa`. Impact: `bloqueia`, `atrapalha`, `cosmetico`. | `supabase/migrations/20260915163213_buddy_oportunidades.sql`, `src/lib/oportunidades.functions.ts` | The TypeScript status type also has `aberto`, which the DB check rejects (see [open-questions.md](../open-questions.md)). |
| BR-149 | Card number is generated as `OPT-XXXX` from a sequence. | same (`oportunidades_gera_numero`) | |
| BR-150 | Every status change is written to `oportunidade_historico`, with an optional reason. | same (`oportunidades_log_status`) | |
| BR-151 | Moving a card to another status resets the author's approval. | same (`oportunidades_reset_aprovacao`) | |
| BR-152 | Only admins (or the service role) can change the status. Exception: the author may return a card from `entregue` to `em_analise` while not approved. | same (`oportunidades_guard_status_admin`) | |
| BR-153 | Only admins can set `data_prevista` (promised date). | same (`oportunidades_guard_data_prevista`) | |
| BR-154 | A delivery can be refused only from `entregue`, before approval, by the author or an admin, with a reason of at least 10 characters. The card returns to `em_analise` and the reason goes to history. | same (`recusar_entrega_oportunidade`) | |
| BR-155 | A card awaits client approval when it is `entregue` and has no `aprovado_autor_em`. Admins can approve any author's delivery. | `src/lib/oportunidades.functions.ts` (`aguardandoAprovacaoCliente`, `adminPodeAprovarEntrega`) | Test: `src/test/oportunidades.functions.test.ts`, `src/test/adminPublicar.test.tsx` (inferred). |
| BR-156 | Comments are `interno` (team only) or `publico` (the author reads them). | `src/lib/oportunidades.functions.ts` | |
| BR-157 | The approval reminder popup shows when there is no saved state, or the saved day (America/Sao_Paulo) is not today, or the snooze has ended, or at least 1 hour passed since the last display. | `src/lib/oportunidades-aprovacao-reminder.ts` (`deveMostrarReminder`) | Test: `src/test/oportunidades-aprovacao-reminder.test.ts`. |
| BR-158 | `is_admin()` delegates to `has_role(auth.uid(), 'admin')`. `has_acesso(text)` returns true for any authenticated user when the project has no access catalog. | `supabase/migrations/20260915163213_buddy_oportunidades.sql` | |
