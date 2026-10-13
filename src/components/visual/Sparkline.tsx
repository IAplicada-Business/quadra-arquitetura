import { useId } from "react";
import { cn } from "@/lib/utils";

interface SparklineProps {
  /** Série na ordem cronológica. Menos de dois pontos não desenha nada. */
  data: number[];
  width?: number;
  height?: number;
  /** Cor da linha. Aceita qualquer cor CSS — o padrão é a cor de realce. */
  color?: string;
  /** Preenche a área sob a linha com um gradiente da própria cor. */
  filled?: boolean;
  className?: string;
  /** Descrição para leitor de tela. Sem ela o gráfico fica aria-hidden. */
  label?: string;
}

/**
 * Minigráfico de tendência para caber dentro de um card de indicador.
 *
 * É SVG inline de propósito: a faixa de indicadores renderiza cinco ou
 * seis destes de uma vez, e trazer uma biblioteca de gráfico para
 * desenhar uma polilinha custaria mais do que o desenho.
 *
 * O viewBox é fixo e o SVG estica com preserveAspectRatio="none", então
 * o componente acompanha o card quando a faixa aperta (R5) sem precisar
 * medir nada em JS.
 */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "hsl(var(--accent-brand))",
  filled = false,
  className,
  label,
}: SparklineProps) {
  const gradId = useId();
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  // Série constante: desenha no meio em vez de dividir por zero.
  const span = max - min || 1;
  const stepX = width / (data.length - 1);

  const pontos = data.map((v, i) => {
    const x = i * stepX;
    const y = max === min ? height / 2 : height - ((v - min) / span) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const linha = `M ${pontos.join(" L ")}`;
  const area = `${linha} L ${width},${height} L 0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      className={cn("overflow-visible", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {filled && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradId})`} stroke="none" />
        </>
      )}
      <path
        d={linha}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
