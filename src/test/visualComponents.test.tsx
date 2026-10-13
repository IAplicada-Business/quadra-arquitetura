import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sparkline } from "@/components/visual/Sparkline";
import { ProgressRing } from "@/components/visual/ProgressRing";
import { StatusPill } from "@/components/visual/StatusPill";
import { PageSkeleton } from "@/components/visual/PageSkeleton";

describe("Sparkline", () => {
  it("não desenha nada com menos de dois pontos", () => {
    const { container } = render(<Sparkline data={[5]} />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("desenha um ponto por valor da série", () => {
    const { container } = render(<Sparkline data={[1, 4, 2, 8]} label="Tendência" />);
    const d = container.querySelector("path")!.getAttribute("d")!;
    // M + 3 x L  => quatro coordenadas
    expect(d.split(/[ML]/).filter((p) => p.trim()).length).toBe(4);
  });

  /* Série constante dividiria por zero no cálculo da altura; o desenho
     tem que sair na metade, não em NaN. */
  it("aguenta série constante sem gerar NaN", () => {
    const { container } = render(<Sparkline data={[3, 3, 3]} height={24} />);
    const d = container.querySelector("path")!.getAttribute("d")!;
    expect(d).not.toContain("NaN");
    expect(d).toContain("12.00");
  });

  it("só é anunciado quando recebe label", () => {
    const { container, rerender } = render(<Sparkline data={[1, 2]} />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    rerender(<Sparkline data={[1, 2]} label="Receita" />);
    expect(screen.getByRole("img", { name: "Receita" })).toBeInTheDocument();
  });
});

describe("ProgressRing", () => {
  const offset = (c: HTMLElement) =>
    Number(c.querySelectorAll("circle")[1].getAttribute("stroke-dashoffset"));

  it("fecha o anel em 100% e deixa vazio em 0%", () => {
    const { container: cheio } = render(<ProgressRing value={100} />);
    expect(offset(cheio.firstChild as HTMLElement)).toBeCloseTo(0, 5);
    const { container: vazio } = render(<ProgressRing value={0} size={40} thickness={4} />);
    expect(offset(vazio.firstChild as HTMLElement)).toBeCloseTo(2 * Math.PI * 18, 5);
  });

  it("apara valor fora da faixa em vez de desenhar arco inválido", () => {
    const { container } = render(<ProgressRing value={340} />);
    expect(offset(container.firstChild as HTMLElement)).toBeCloseTo(0, 5);
  });

  it("mostra o percentual arredondado quando pedido", () => {
    render(<ProgressRing value={63.7} showValue />);
    expect(screen.getByText("64")).toBeInTheDocument();
  });
});

describe("StatusPill", () => {
  it("usa o token de cada estado", () => {
    render(<StatusPill tone="doing">Em execução</StatusPill>);
    expect(screen.getByText("Em execução").className).toContain("bg-status-doing");
  });

  /* Quem não distingue cor precisa de outra pista além do fundo. */
  it("aceita ponto além da cor", () => {
    const { container } = render(
      <StatusPill tone="back" dot>
        Atrasado
      </StatusPill>,
    );
    expect(container.querySelector("span[aria-hidden]")).toBeInTheDocument();
  });
});

describe("PageSkeleton", () => {
  it("anuncia carregamento uma vez só", () => {
    render(<PageSkeleton variant="table" rows={5} />);
    expect(screen.getAllByText("Carregando…")).toHaveLength(1);
    expect(screen.getByText("Carregando…").closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
  });

  it("reserva a faixa de indicadores quando pedida", () => {
    const { container } = render(<PageSkeleton variant="cards" rows={3} kpis={4} />);
    const faixa = container.querySelector(".min-\\[900px\\]\\:grid-cols-4");
    expect(faixa?.children).toHaveLength(4);
  });

  it("muda a geometria conforme a variante", () => {
    const { container: tabela } = render(<PageSkeleton variant="table" rows={4} />);
    const { container: kanban } = render(<PageSkeleton variant="kanban" rows={5} />);
    expect(tabela.querySelector(".overflow-x-auto")).toBeNull();
    expect(kanban.querySelector(".overflow-x-auto")).toBeInTheDocument();
  });
});
