# Design system

Last verified: 2026-11-08, commit 4ad4101 (branch main) plus uncommitted working tree.

The UI uses shadcn/ui (Radix primitives) on Tailwind CSS 3 with CSS variables. The visual identity ("Quadra": navy, terracotta, sand) is defined as HSL variables in `src/index.css` and mapped in `tailwind.config.ts`. The code refers to an "IAplicada standard" (rounded 16 px base radius, four status tones).

## Tokens

Defined in `src/index.css` (`:root` and `.dark`), consumed through Tailwind names in `tailwind.config.ts`.

| Group | Tokens | Notes |
|---|---|---|
| Base | `--background` (#FAF7F2), `--foreground` (navy #1B2A4A), `--card`, `--popover`, `--border`, `--input`, `--ring` | Ring is terracotta |
| Brand actions | `--primary` (navy), `--secondary` (light rosy beige), `--accent` (terracotta #C4756E), `--muted`, `--destructive` | Each has a `-foreground` pair |
| Semantic | `--success`, `--warning`, `--warning-ink`, `--accent-ink` | `-ink` variants are darker for text contrast |
| Brand palette | `--brand-navy`, `--brand-terracota`, `--brand-areia`, `--brand-vinho`, `--brand-creme`, `--brand-rosa`, `--brand-pedra` | Exact landing page colors; Tailwind `brand.*` |
| Surfaces | `--deep`, `--deep-foreground`, `--soft-foreground`, `--primary-hover`, `--accent-brand` | `bg-deep` is the login and loading background |
| Status tones | `--status-now`, `--status-doing`, `--status-next`, `--status-back` (+ foreground) | Used by `StatusPill` |
| Sidebar | `--sidebar-*` | Dark navy sidebar |
| Charts | `--chart-1` to `--chart-5` | Recharts needs concrete values: see `src/lib/chartColors.ts` (`C`, `BRAND_HEX`) |
| Radius | `--radius` = 1rem; `lg`, `md`, `sm` derived in `tailwind.config.ts` | `--radius-sm` to `--radius-xl` also exist |
| Shadows | `--shadow-xs/sm/md/lg`, `--shadow-soft`, `--shadow-card`, `--shadow-elevated` | Tailwind: `shadow-xs`, `soft`, `card`, `elev`, `float`, `elevated` |
| Typography | `--font-display` Cormorant Garamond, `--font-body` Jost | Tailwind `font-display`, `font-body`, `font-sans`, `font-serif`, `font-playfair` (alias of display) |

Dark mode: `darkMode: ["class"]`. `index.html` adds class `dark` from `localStorage.theme === "dark"` before paint. `next-themes` is used only by `src/components/ui/sonner.tsx`. The toggle is in `src/components/layout/AppHeader.tsx` (stores `theme`); `src/pages/SettingsPage.tsx` also adds class `dark` on load.

Discipline colors for schedule and charts are a fixed map in `src/lib/disciplineColors.ts` (`DISCIPLINE_COLOR_MAP`, `getDisciplineColor`, default `#9CA3AF`). Gantt and pies use it.

Custom utility classes in `src/index.css`: `title-balance`, `trama-quadra`, `trama-quadra-clara`, `label-cat`, `text-display`, `text-body`, `font-display`, `font-body`, `bg-sidebar-gradient`, `card-interactive`, `icon-chip`, `card-rocket`, `bg-gradient-marca`, `bg-gradient-cta`, `scrollbar-elegant`, `scrollbar-sidebar`, plus `.trilha` (client portal styles) and `.auth-blob` (login blobs, motion disabled under reduced motion).

## Components

### Primitives (`src/components/ui/`, 52 files)

Standard shadcn set (accordion, alert-dialog, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip) plus three project files:

| File | Purpose |
|---|---|
| `src/components/ui/section-tabs.tsx` | Underlined sub-tabs inside a page tab (`SectionTabsList`, `SectionTabsTrigger`) |
| `src/components/ui/voice-input-button.tsx` | Microphone input button |
| `src/components/ui/ia-siri-chat.tsx` | Chat visual widget |

Variants (`class-variance-authority`):

| Component | Variants | Sizes |
|---|---|---|
| `Button` (`src/components/ui/button.tsx`) | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` | `default` (h-10), `sm` (h-9), `lg` (h-11), `icon` |
| `Badge` (`src/components/ui/badge.tsx`) | `default`, `secondary`, `destructive`, `outline` | |

### Project widgets (`src/components/visual/`)

| Component | Props (main) | Use |
|---|---|---|
| `StatusPill` | `tone` (`now`/`doing`/`next`/`back`), `children`, `dot?`, `className?` | Flow position of an item; separate from `Badge` on purpose |
| `InfoHint` | hint text | Inline help |
| `KanbanLayout` | columns | Shared kanban frame |
| `PageSkeleton` | none | Loading placeholder |
| `ProgressRing` | value | Circular progress |
| `ShowMore` | list, limit | Collapsed lists (tested in `src/test/showMore.test.tsx`) |
| `Sparkline` | series | Small chart |

Prop lists above are from names and usage (inferred) except `StatusPill`, read from source.

### Feature components

Organized by domain under `src/components/` (see [modules.md](modules.md)). Shared patterns:

- Confirmation before delete: `src/components/ConfirmDeleteDialog.tsx` (`src/test/confirmDeleteDialog.test.tsx`).
- Status color maps are local constants (`statusColors` in `src/lib/projectConstants.ts`, `CLOSING_STATUS_CLASS` in `src/lib/closingStatus.ts`, `DELIVERY_PRIORITY_CLASSES` in `src/lib/deliveryChecklist.ts`).
- Charts use Recharts with `src/lib/chartColors.ts`.
- Animations: `framer-motion` helpers in `src/lib/motion.ts` and `src/components/landing/Motion.tsx`.

## Layout

- Staff app: `AppLayout` (`src/components/layout/AppLayout.tsx`) = fixed sidebar (collapsible, state in `localStorage.sidebar_collapsed`) + header + scrolling `Outlet`. On mobile the sidebar is a `Sheet` (`use-mobile` hook).
- Sidebar groups: Análises Quadra, Comercial, Gestão de Obras, Gestão de Conteúdo, Administrativo (`src/components/layout/AppSidebar.tsx`). Parent items open sub-menus.
- Project detail uses top tabs (`resumo` ... `onboarding`) with `SectionTabs` inside tabs.
- Tailwind container: centered, 2rem padding, `2xl` at 1400 px.
- The chat box (`AIChatBox`) and the Buddy reminder float over the layout.

## Naming

- Components `PascalCase.tsx`, hooks `useXxx.ts`, lib files `camelCase.ts`, tests `camelCase.test.ts(x)`.
- UI copy is Portuguese. Domain names in code are often Portuguese (`cronograma`, `pendencias`, `oportunidades`).

## Accessibility

- Spinners use `aria-busy="true"` (`ProtectedRoute`, `AdminPublicar`).
- `sr-only` titles on the mobile sheet (`AppLayout`). About 310 `aria-` or `sr-only` occurrences exist in components and pages.
- `StatusPill` has an optional dot so state does not rely on color alone.
- Warning text color was adjusted for contrast (comment in `src/index.css`: white on amber measured 2.48).
- Reduced motion is respected for `.auth-blob`.
- No automated accessibility test exists.

## State management

- Server state: TanStack Query (`src/App.tsx`).
- Auth: React context (`src/contexts/AuthContext.tsx`).
- Local UI state: `useState` in components. `react-hook-form` and `zod` appear only in `src/components/ui/form.tsx`; feature forms use plain `useState` (see [open-questions.md](open-questions.md)).
- Persistent UI flags in `localStorage` (sidebar, theme, onboarding seen, reminder snooze).
- Toasts: `src/hooks/use-toast.ts` (Radix toast) and `sonner` both mounted in `src/App.tsx`.
