import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInForm } from "./sign-in-form";

describe("SignInForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders form elements properly", () => {
    render(
      <SignInForm
        onDone={vi.fn()}
        onForgotPassword={vi.fn()}
        onCreateAccount={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Criar conta" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /esqueci minha senha/i }),
    ).toBeInTheDocument();
  });

  it("submits credentials and calls onDone on success", async () => {
    const user = userEvent.setup();
    const handleDone = vi.fn();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as Response);

    render(
      <SignInForm
        onDone={handleDone}
        onForgotPassword={vi.fn()}
        onCreateAccount={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/e-mail/i), "cliente@exemplo.com.br");
    await user.type(screen.getByLabelText(/senha/i), "senha123");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(global.fetch).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "cliente@exemplo.com.br",
        password: "senha123",
      }),
    });

    await waitFor(() => {
      expect(handleDone).toHaveBeenCalledTimes(1);
    });
  });

  it("displays error message on authentication failure", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ "content-type": "application/json" }),
      json: () =>
        Promise.resolve({
          error: "E-mail ou senha incorretos.",
          statusCode: 401,
        }),
    } as Response);

    render(
      <SignInForm
        onDone={vi.fn()}
        onForgotPassword={vi.fn()}
        onCreateAccount={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/e-mail/i), "cliente@exemplo.com.br");
    await user.type(screen.getByLabelText(/senha/i), "errada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent("E-mail ou senha incorretos.");
  });

  it("triggers callback when secondary actions are clicked", async () => {
    const user = userEvent.setup();
    const handleCreateAccount = vi.fn();
    const handleForgotPassword = vi.fn();

    render(
      <SignInForm
        onDone={vi.fn()}
        onForgotPassword={handleForgotPassword}
        onCreateAccount={handleCreateAccount}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(handleCreateAccount).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole("button", { name: /esqueci minha senha/i }),
    );
    expect(handleForgotPassword).toHaveBeenCalledTimes(1);
  });
});
