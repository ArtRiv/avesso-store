"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { problemMessage } from "@/lib/api/browser";
import { AuthPanel } from "@/components/auth-panel";
import { SignInForm } from "@/components/sign-in-form";
import { TextButton } from "@/components/text-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type View = "signIn" | "forgot" | "forgotSent";

export function SignInPanel({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>("signIn");

  if (view === "forgotSent") {
    return (
      <AuthPanel
        title="Verifique seu e-mail"
        // The backend answers identically whether or not the account exists —
        // it is anti-enumeration. This copy has to be just as indifferent, or
        // it hands back exactly the answer the backend withheld.
        note="Se houver uma conta com esse endereço, o link para redefinir a senha chega em instantes. Ele vale por uma hora."
      >
        <Button variant="secondary" onClick={() => setView("signIn")}>
          Voltar
        </Button>
      </AuthPanel>
    );
  }

  if (view === "forgot") {
    return (
      <AuthPanel
        title="Redefinir senha"
        note="Enviamos um link para o e-mail cadastrado."
      >
        <ForgotPasswordForm
          onSent={() => setView("forgotSent")}
          onCancel={() => setView("signIn")}
        />
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      title="Entrar"
      note="Você precisa de uma conta para montar a sacola."
    >
      <SignInForm
        onDone={() => {
          // The session now lives in httpOnly cookies the server sets, and the
          // router cache is holding pages rendered for a signed-out visitor.
          // Refreshing is what makes the header and the sacola agree with the
          // cookies.
          router.replace(returnTo);
          router.refresh();
        }}
        onForgotPassword={() => setView("forgot")}
        onCreateAccount={() => router.push("/criar-conta")}
      />
    </AuthPanel>
  );
}

function ForgotPasswordForm({
  onSent,
  onCancel,
}: {
  onSent: () => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

        void (async () => {
          try {
            const response = await fetch("/api/auth/forgot-password", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email }),
            });

            if (response.ok) {
              onSent();

              return;
            }

            setError(await problemMessage(response));
          } catch {
            setError(
              "Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo.",
            );
          } finally {
            setSubmitting(false);
          }
        })();
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="forgot-email">E-mail</Label>
        <Input
          id="forgot-email"
          type="email"
          required
          autoComplete="email"
          placeholder="seu@email.com.br"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        {error ? (
          <p role="alert" className="text-small text-clay">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Enviando" : "Enviar link"}
        </Button>
        <TextButton
          className="text-small self-start text-muted"
          onClick={onCancel}
        >
          Voltar para a entrada
        </TextButton>
      </div>
    </form>
  );
}
