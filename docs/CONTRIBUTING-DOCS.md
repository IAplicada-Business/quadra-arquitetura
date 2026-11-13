# Contributing to the docs

Last verified: 2026-11-08, commit 4ad4101 (branch main) plus uncommitted working tree.

## Rule

Update the docs in the same change as the code. A pull request that changes behavior without touching `docs/` is incomplete.

## What requires a docs update

| You changed | Update |
|---|---|
| A screen, route or menu item | [modules.md](modules.md), [business-rules/access.md](business-rules/access.md) if permissions change |
| A business rule (calculation, status, threshold, validation) | The matching file in [business-rules/](business-rules/) and the index in [business-rules.md](business-rules.md) |
| A multi-step process | [logic-flows.md](logic-flows.md) |
| A table, column, enum, trigger, RLS policy, bucket or migration | [data-model.md](data-model.md) |
| An edge function, RPC, realtime channel or request/response shape | [api.md](api.md) |
| A token, component, variant or layout pattern | [design-system.md](design-system.md) |
| An env var, config file, script or deploy step | [configuration.md](configuration.md) and the root `README.md` table |
| Test tooling or a new test area | [testing.md](testing.md) |
| A convention | [conventions.md](conventions.md) |
| A structural choice | Add an ADR in [decisions/](decisions/README.md) |
| You found a doubt, bug or dead code you did not fix | [open-questions.md](open-questions.md) |

## How to write

- English only. Short, direct sentences.
- Start every file with `Last verified: <date>, commit <short hash> (branch <name>)`. Add "plus uncommitted working tree" when it applies. Refresh the line when you re-verify the file.
- Use relative paths like `src/lib/funnel.ts` (`computeFunnel`).
- Each fact lives in one place. Link instead of copying.
- Use tables for structured data and Mermaid for diagrams. Avoid long code blocks.
- Mark interpretation with "(inferred)".
- Never write secrets, tokens, `.env` values or real personal data. Env var names only.
- Keep rule ids stable. When you remove a rule, mark it `removed` in place.
- Do not translate code identifiers or code comments.

## Checklist before merging

1. Every path, function name, config key and command you cite exists (use `rg` or `ls`).
2. The index tables in [README.md](README.md) and [business-rules.md](business-rules.md) still match the files.
3. New doubts are in [open-questions.md](open-questions.md).
4. The root `README.md` (pt-BR) is updated if the change affects setup, env vars, stack or features.
