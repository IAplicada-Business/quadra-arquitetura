import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShowMoreButton, useShowMore } from "@/components/visual/ShowMore";

function List({ items, filter }: { items: number[]; filter: string }) {
  const more = useShowMore(items, 5, filter);
  return (
    <div>
      <ul>{more.visible.map((i) => <li key={i}>{i}</li>)}</ul>
      <ShowMoreButton expanded={more.expanded} hasMore={more.hasMore} total={items.length} onToggle={more.toggle} noun="itens" />
    </div>
  );
}

describe("useShowMore", () => {
  const items = Array.from({ length: 12 }, (_, i) => i);

  it("mostra 5 e expande com Ver todos", () => {
    render(<List items={items} filter="a" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    fireEvent.click(screen.getByText(/Ver todos os itens \(12\)/));
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
    fireEvent.click(screen.getByText(/Ver menos/));
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("volta ao modo curto quando o filtro muda", () => {
    const { rerender } = render(<List items={items} filter="a" />);
    fireEvent.click(screen.getByText(/Ver todos/));
    rerender(<List items={items} filter="b" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("sem botão quando cabe tudo", () => {
    render(<List items={[1, 2, 3]} filter="a" />);
    expect(screen.queryByText(/Ver todos/)).toBeNull();
  });
});
