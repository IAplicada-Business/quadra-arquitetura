# Conventions

Last verified: 2026-11-08, commit 4ad4101 (branch main) plus uncommitted working tree.

Conventions seen in the code. There is no style guide file in the repo.

## Code

- Language: TypeScript with `strict: false`. Many `as any` casts exist (for example in `src/hooks/useLeads.ts`) because generated types lag behind the schema.
- Imports use the `@/` alias.
- Data access: one hook per entity in `src/hooks/useXxx.ts` using TanStack Query. Mutations invalidate query keys and show a toast.
- Query keys are arrays starting with the entity name (`["leads"]`, `["payments", projectId]`, `["my-permissions", userId]`).
- Domain logic goes in `src/lib/` as pure functions, with `today`/`now` as optional parameters for testing (`computeReverseMetrics(a, today)`).
- Dates: ISO `YYYY-MM-DD` strings. Calendar math runs in UTC (`T00:00:00Z`) to avoid timezone drift (`src/lib/businessCalendar.ts`). Some hooks use `date-fns` in local time.
- Money: numbers in BRL, formatted with `pt-BR` `Intl` or `toLocaleString("pt-BR")`.
- Empty form strings become `null` through `sanitizeEmptyStrings` before insert.
- Edge functions: Deno, `Deno.serve` or `serve` from `deno.land/std`, CORS `*`, JSON responses with `error` on failure. AI functions request structured output (`output_config.format` JSON schema).
- Comments are in Portuguese and often cite the meeting or request that motivated a rule (for example "Mariana, vídeo 16"). Keep that habit for rule origins; do not translate existing comments.

## Naming

- Files: components `PascalCase.tsx`; hooks `useCamelCase.ts`; lib `camelCase.ts`; tests `camelCase.test.ts(x)`; migrations `<timestamp>_<snake_case>.sql`.
- Routes are lower case with hyphens or slashes in English or Portuguese (`/esqueci-senha`, `/construction/voice-tasks`).
- DB: snake_case tables and columns; status values in Portuguese snake_case (`em_andamento`).
- Page keys: snake_case (`financeiro_lancamentos`) in `src/lib/pagePermissions.ts`.

## UI

- Use tokens and Tailwind semantic classes (`bg-primary`, `text-muted-foreground`), not raw hex. See [design-system.md](design-system.md).
- UI copy in pt-BR, with accents.
- Destructive actions use `ConfirmDeleteDialog` and `handleDeleteError` for FK errors.
- Long lists use `ShowMore` or pagination.

## Database

- Every new table: enable RLS and add team policies (`get_team_user_ids()`). Insert policy checks `auth.uid() = user_id`.
- Rules that must always hold go into triggers (see ADR-006), not only into the UI.
- Make migrations idempotent when possible (`IF NOT EXISTS`).
- Add a unique index when a double click or two tabs could duplicate rows (see `20261104120000_payments_cotacao_unique_installments.sql`).

## Git and tooling

- Commit messages are not constrained by any hook found in the repo.
- Lovable also commits to this repo (README). Expect machine-written files (`client.ts`, `types.ts`, uuid-named migrations).
- Lint with `npm run lint`. `@typescript-eslint/no-unused-vars` is off.

## Documentation

- `docs/` is English and must be updated in the same change as code: [CONTRIBUTING-DOCS.md](CONTRIBUTING-DOCS.md).
- The root README is pt-BR.
