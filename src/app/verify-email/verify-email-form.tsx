"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { problemMessage } from "@/lib/api/browser";
import { AuthPanel } from "@/components/auth-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WaitBar } from "@/components/wait-bar";

type State =
  | { step: "confirming" }
  | { step: "done" }
  | { step: "failed"; message: string }
  | { step: "resent" };

/**
 * Confirms the address, then offers a way out of the one dead end this flow
 * has.
 *
 * The token is spent by a POST from this component rather than by the link
 * itself. A GET that verified on sight would be spent by whatever opened it
 * first — mail providers fetch links to scan them, and corporate filters and
 * link checkers do the same — and since the token is single-use, the customer
 * would arrive at an already-consumed link and be locked out of an account
 * they cannot sign into. Password login stays shut until the address is
 * confirmed, so that dead end is total, which is why the resend form below is
 * part of this page rather than somewhere else.
 */
export function VerifyEmailForm({ token }: { token: string | null }) {
  const [state, setState] = useState<State>(
    token ? { step: "confirming" } : { step: "failed", message: MISSING },
  );

  // React runs effects twice in development. Verification spends a single-use
  // token, so the second run would report a working link as already used.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) {
      return;
    }

    attempted.current = true;

    void (async () => {
      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });

        setState(
          response.ok
            ? { step: "done" }
            : { step: "failed", message: await problemMessage(response) },
        );
      } catch {
        setState({ step: "failed", message: OFFLINE });
      }
    })();
  }, [token]);

  if (state.step === "confirming") {
    return (
      <AuthPanel
        title="Confirmando seu e-mail"
        note="Isto leva alguns segundos."
      >
        <WaitBar label="Confirmando seu e-mail" />
      </AuthPanel>
    );
  }

  if (state.step === "done") {
    return (
      <AuthPanel
        title="E-mail confirmado"
        note="Sua conta está pronta. Agora você pode entrar e montar sua sacola."
      >
        <Button asChild>
          <Link href="/entrar">Entrar</Link>
        </Button>
      </AuthPanel>
    );
  }

  if (state.step === "resent") {
    return (
      <AuthPanel
        title="Link enviado"
        note="Se houver uma conta com esse e-mail, o novo link de confirmação chega em instantes. Ele vale por 24 horas."
      >
        <Button asChild variant="secondary">
          <Link href="/">Voltar ao catálogo</Link>
        </Button>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel title="Não foi possível confirmar" note={state.message}>
      <ResendForm onSent={() => setState({ step: "resent" })} />
    </AuthPanel>
  );
}

function ResendForm({ onSent }: { onSent: () => void }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSending(true);
        setError(null);

        void (async () => {
          try {
            const response = await fetch("/api/auth/resend-verification", {
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
            setError(OFFLINE);
          } finally {
            setSending(false);
          }
        })();
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="resend-email" className={error ? "text-clay" : ""}>
          E-mail
        </Label>
        <Input
          id="resend-email"
          type="email"
          required
          autoComplete="email"
          placeholder="seu@email.com.br"
          value={email}
          aria-invalid={error ? true : undefined}
          onChange={(event) => setEmail(event.target.value)}
        />
        {error ? <p className="text-small text-clay">{error}</p> : null}
      </div>

      <Button type="submit" disabled={sending}>
        {sending ? "Enviando" : "Enviar novo link"}
      </Button>
    </form>
  );
}

const MISSING =
  "O endereço não trouxe um código de confirmação. Abra o link direto do e-mail que enviamos.";

const OFFLINE =
  "Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo.";
