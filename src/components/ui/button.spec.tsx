import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders with default variant and size", () => {
    render(<Button>Clique aqui</Button>);
    const button = screen.getByRole("button", { name: "Clique aqui" });

    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("data-variant", "default");
    expect(button).toHaveAttribute("data-size", "default");
    expect(button).toHaveClass("bg-ink", "text-paper");
  });

  it("renders secondary and destructive variants", () => {
    const { rerender } = render(<Button variant="secondary">Secundário</Button>);
    let button = screen.getByRole("button", { name: "Secundário" });
    expect(button).toHaveClass("border-ink", "bg-transparent");

    rerender(<Button variant="destructive">Excluir</Button>);
    button = screen.getByRole("button", { name: "Excluir" });
    expect(button).toHaveClass("border-clay", "text-clay");
  });

  it("handles click events", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Ação</Button>);
    const button = screen.getByRole("button", { name: "Ação" });

    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not trigger click when disabled", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button disabled onClick={handleClick}>
        Desabilitado
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Desabilitado" });

    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:pointer-events-none");
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
