"use client";

import { useState } from "react";

import { problemMessage } from "@/lib/api/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TextButton } from "@/components/text-link";

/**
 * The sign-in fields, exactly as artboard 05 lays them out: e-mail, password,
 * `Entrar` primary, `Criar conta` secondary, `Esqueci minha senha` as a link.
 *
 * Lives outside any one page because it has two homes — this is the panel the
 * PDP shows in place of its CTA when an anonymous visitor tries to add to the
 * sacola, where the whole point is that the page does not navigate. `onDone`
 * is what differs: the PDP finishes the interrupted add, the sign-in page
 * moves on.
 */
export function SignInForm({
  onDone,
  onForgotPassword,
  onCreateAccount,
}: {
  onDone: () => void;
  onForgotPassword: () => void;
  onCreateAccount: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
            const response = await fetch("/api/auth/login", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email, password }),
            });

            if (response.ok) {
              onDone();

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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="signin-email">E-mail</Label>
          <Input
            id="signin-email"
            type="email"
            required
            autoComplete="email"
            placeholder="seu@email.com.br"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="signin-password">Senha</Label>
          <Input
            id="signin-password"
            type="password"
            required
            autoComplete="current-password"
            className="font-mono"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {/* The message never says which half was wrong — the backend refuses
            to, so that nothing here can be used to discover which addresses
            have accounts, and the copy keeps that promise. */}
        {error ? (
          <p role="alert" className="text-small text-clay">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Entrando" : "Entrar"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCreateAccount}>
          Criar conta
        </Button>
      </div>

      <TextButton className="text-small self-start text-muted" onClick={onForgotPassword}>
        Esqueci minha senha
      </TextButton>
    </form>
  );
}
