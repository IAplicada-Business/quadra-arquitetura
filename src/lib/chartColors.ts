// Paleta centralizada para charts e dashboards — alinhada aos CSS
// variables do index.css para consistência visual em toda a plataforma.
//
// Recharts não aceita `hsl(var(--primary))` diretamente em fill/stroke,
// por isso os valores são strings HSL concretas que espelham o index.css.

// Hex equivalents for contexts that require CSS hex (e.g. <input type="color">)
export const BRAND_HEX = {
  navy: "#1B2A4A",
} as const;

export const C = {
  // Brand primários (navy + terracota)
  navy:      "hsl(220, 47%, 22%)",   // --primary
  navyMid:   "hsl(220, 40%, 45%)",   // navy intermediário
  navyFaint: "hsl(220, 30%, 72%)",   // navy suave (barras de fundo)
  navyBg:    "hsl(220, 30%, 96%)",   // fundo tintado navy
  navyTint:  "hsla(220, 47%, 22%, 0.16)", // preenchimento translúcido de barra
  terra:     "hsl(6, 40%, 60%)",     // --accent / terracota

  // Semânticos
  success:   "hsl(152, 50%, 38%)",   // --success
  warning:   "hsl(32, 88%, 52%)",    // --warning
  danger:    "hsl(0, 65%, 50%)",     // --destructive

  // Neutro
  muted:     "hsl(30, 25%, 65%)",

  // Séries para gráficos de múltiplas categorias (4 cores)
  series: [
    "hsl(220, 47%, 22%)",   // navy
    "hsl(6, 40%, 60%)",     // terra
    "hsl(220, 40%, 45%)",   // navyMid
    "hsl(30, 25%, 65%)",    // muted
  ] as const,
} as const;
