import logoAzul from "@/assets/logo-azul.png";
import logoBege from "@/assets/logo-bege.png";

/**
 * Marca da Quadra na Trilha do Cliente: o logo empilhado (QUA/DRA/
 * ARQUITETURA) em azul sobre fundo claro e em bege sobre o azul-marinho.
 */
export function QuadraLogo({ tone = "navy", className = "" }: { tone?: "navy" | "light"; className?: string }) {
  return <img src={tone === "light" ? logoBege : logoAzul} alt="Quadra Arquitetura" className={`h-auto select-none ${className}`} draggable={false} />;
}

/**
 * Logo bem grande e quase transparente ao fundo, cortado pela borda.
 * Decorativo: fica atrás do conteúdo e não recebe clique nem leitor de tela.
 */
export function QuadraWatermark({
  tone = "navy",
  className = "",
  opacity = 0.045,
}: {
  tone?: "navy" | "light";
  className?: string;
  opacity?: number;
}) {
  return (
    <img
      src={tone === "light" ? logoBege : logoAzul}
      alt=""
      aria-hidden
      draggable={false}
      data-testid="quadra-watermark"
      className={`pointer-events-none absolute select-none ${className}`}
      style={{ opacity }}
    />
  );
}
