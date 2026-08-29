"use client";

import Link from "next/link";
import { useState } from "react";

import { problemMessage } from "@/lib/api/browser";
import { AuthPanel } from "@/components/auth-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** The backend's policy: length only, no composition rules. */
const MIN_LENGTH = 8;

/**
 * Sets a new password from the token in the reset e-mail.
 *
 * Nothing is submitted on arrival — unlike verification, this needs the
 * customer to type something, so the single-use token is only spent when they
 * press the button.
 *
 * Worth saying on screen, because it surprises people: setting a password
 * signs out every other session, not just this one.
 */
export function ResetPasswordForm({ token }: { token: string | null }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthPanel
        title="Link inválido"
        note="O endereço não trouxe um código de redefinição. Abra o link direto do e-mail que enviamos."
      >
        <Button asChild variant="secondary">
          <Link href="/entrar">Ir para a entrada</Link>
        </Button>
      </AuthPanel>
    );
  }

  if (done) {
    return (
      <AuthPanel
        title="Senha alterada"
        note="Encerramos as sessões abertas em todos os aparelhos. Entre novamente com a senha nova."
      >
        <Button asChild>
          <Link href="/entrar">Entrar</Link>
        </Button>
      </AuthPanel>
    );
  }

  const mismatch = confirmation.length > 0 && confirmation !== password;
  const tooShort = password.length > 0 && password.length < MIN_LENGTH;

  return (
    <AuthPanel
      title="Escolha uma senha nova"
      note="Ao salvar, encerramos as sessões abertas em todos os aparelhos."
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();

          if (mismatch || password.length < MIN_LENGTH) {
            return;
          }

          setSubmitting(true);
          setError(null);

          void (async () => {
            try {
              const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ token, newPassword: password }),
              });

              if (response.ok) {
                setDone(true);

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
          <Label htmlFor="new-password" className={tooShort ? "text-clay" : ""}>
            Nova senha
          </Label>
          <Input
            id="new-password"
            type="password"
            required
            minLength={MIN_LENGTH}
            autoComplete="new-password"
            className="font-mono"
            placeholder="••••••••"
            value={password}
            aria-invalid={tooShort ? true : undefined}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className={tooShort ? "text-small text-clay" : "text-small text-muted"}>
            Pelo menos {MIN_LENGTH} caracteres. Não exigimos símbolos nem
            números.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label
            htmlFor="confirm-password"
            className={mismatch ? "text-clay" : ""}
          >
            Repita a senha
          </Label>
          <Input
            id="confirm-password"
            type="password"
            required
            autoComplete="new-password"
            className="font-mono"
            placeholder="••••••••"
            value={confirmation}
            aria-invalid={mismatch ? true : undefined}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          {mismatch ? (
            <p className="text-small text-clay">As duas senhas não coincidem.</p>
          ) : null}
        </div>

        {error ? <p className="text-small text-clay">{error}</p> : null}

        <Button
          type="submit"
          disabled={submitting || mismatch || password.length < MIN_LENGTH}
        >
          {submitting ? "Salvando" : "Salvar senha"}
        </Button>
      </form>
    </AuthPanel>
  );
}
