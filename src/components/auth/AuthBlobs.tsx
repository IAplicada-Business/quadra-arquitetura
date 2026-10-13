import { useEffect, useId, useRef } from "react";

/**
 * Blobs circulares desfocados atrás do logo do login.
 *
 * Filtro SVG "gooey" (feGaussianBlur + feColorMatrix) faz os círculos se
 * fundirem quando se aproximam. O id do filtro vem de useId(): id fixo
 * colide quando o componente monta duas vezes (StrictMode, transição de
 * rota), e o segundo filtro some.
 *
 * Animação lenta em CSS e leve paralaxe no mouse; ambos desligam com
 * prefers-reduced-motion.
 */
export function AuthBlobs() {
  // useId devolve ":r0:"; dois-pontos quebram o url(#...) do filtro.
  const filterId = `auth-gooey-${useId().replace(/:/g, "")}`;
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 24;
        const y = (e.clientY / window.innerHeight - 0.5) * 24;
        layer.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-testid="auth-blobs">
      <svg className="absolute h-0 w-0">
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
          </filter>
        </defs>
      </svg>

      <div ref={layerRef} className="absolute inset-0 transition-transform duration-700 ease-out">
        <div className="absolute left-1/2 top-[22%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 opacity-60" style={{ filter: `url(#${filterId}) blur(28px)` }}>
          <span className="auth-blob absolute left-[8%] top-[18%] h-48 w-48 rounded-full bg-accent-brand" style={{ animationDuration: "18s" }} />
          <span className="auth-blob absolute right-[6%] top-[30%] h-40 w-40 rounded-full bg-primary" style={{ animationDuration: "22s", animationDelay: "-6s" }} />
          <span className="auth-blob absolute bottom-[10%] left-[32%] h-36 w-36 rounded-full bg-brand-vinho" style={{ animationDuration: "26s", animationDelay: "-12s" }} />
        </div>
      </div>
    </div>
  );
}
