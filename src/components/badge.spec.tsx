import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge, ScarcityBadge, StockBadge } from "./badge";

describe("Badge", () => {
  it("renders children with correct tone classes", () => {
    const { rerender } = render(<Badge tone="moss">Em estoque</Badge>);
    const element = screen.getByText("Em estoque");

    expect(element).toBeInTheDocument();
    expect(element).toHaveClass("border-moss", "text-moss");

    rerender(<Badge tone="clay">Esgotado</Badge>);
    expect(screen.getByText("Esgotado")).toHaveClass("border-clay", "text-clay");

    rerender(<Badge tone="rust">Últimas unidades</Badge>);
    expect(screen.getByText("Últimas unidades")).toHaveClass(
      "border-rust",
      "text-rust",
    );
  });

  it("applies custom classNames", () => {
    render(
      <Badge tone="neutral" className="custom-test-class">
        Neutro
      </Badge>,
    );
    expect(screen.getByText("Neutro")).toHaveClass("custom-test-class");
  });
});

describe("StockBadge", () => {
  it("renders 'Esgotado' with clay tone when stock is 0 or negative", () => {
    const { rerender } = render(<StockBadge stockQuantity={0} />);
    let badge = screen.getByText("Esgotado");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("text-clay");

    rerender(<StockBadge stockQuantity={-1} />);
    badge = screen.getByText("Esgotado");
    expect(badge).toBeInTheDocument();
  });

  it("renders 'Últimas X unidades' with rust tone when stock is <= 3", () => {
    const { rerender } = render(<StockBadge stockQuantity={2} />);
    let badge = screen.getByText("Últimas 2 unidades");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("text-rust");

    rerender(<StockBadge stockQuantity={3} />);
    badge = screen.getByText("Últimas 3 unidades");
    expect(badge).toBeInTheDocument();
  });

  it("renders 'Em estoque' with moss tone when stock is > 3", () => {
    render(<StockBadge stockQuantity={10} />);
    const badge = screen.getByText("Em estoque");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("text-moss");
  });
});

describe("ScarcityBadge", () => {
  it("renders nothing when stock is plentiful (> 3)", () => {
    const { container } = render(<ScarcityBadge stockQuantity={4} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders StockBadge when stock is <= 3", () => {
    render(<ScarcityBadge stockQuantity={2} />);
    expect(screen.getByText("Últimas 2 unidades")).toBeInTheDocument();
  });
});
