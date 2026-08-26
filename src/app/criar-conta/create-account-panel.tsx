"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { problemMessage } from "@/lib/api/browser";
import { AuthPanel } from "@/components/auth-panel";
import { TextLink } from "@/components/text-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** The backend's policy: length only, no composition rules. */
const MIN_LENGTH = 8;

/**
 * Creating an account does not sign anyone in, and there is no token in the
 * response to put in a cookie — password login stays shut until the e-mailed
 * link is followed. So the screen after this one is "check your inbox", never
 * the sacola, and saying so up front is the difference between a customer who
 * waits for an e-mail and one who thinks the button failed.
 */
export function CreateAccountPanel() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState<string | null>(null);

  if (registered) {
    return (
      <AuthPanel
        title="Confirme seu e-mail"
        note={`Enviamos um link de confirmação para ${registered}. Ele vale por 24 horas, e a conta só entra depois que você abrir esse link.`}
      >
        <TextLink href="/" className="text-small text-muted">
          Voltar ao catálogo
        </TextLink>
      </AuthPanel>
    );
  }

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;

  return (
    <AuthPanel
      title="Criar conta"
      note="Você precisa de uma conta para montar a sacola."
    >
      <form
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitting(true);
          setError(null);

          void (async () => {
            try {
              const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name, email, password }),
              });

              if (response.ok) {
                setRegistered(email);

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
            <Label htmlFor="register-name">Nome</Label>
            <Input
              id="register-name"
              required
              autoComplete="name"
              placeholder="Como podemos chamar você"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="register-email">E-mail</Label>
            <Input
              id="register-email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu@email.com.br"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label
              htmlFor="register-password"
              className={tooShort ? "text-clay" : ""}
            >
              Senha
            </Label>
            <Input
              id="register-password"
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
            <p
              className={
                tooShort ? "text-small text-clay" : "text-small text-muted"
              }
            >
              Pelo menos {MIN_LENGTH} caracteres. Não exigimos símbolos nem
              números.
            </p>
          </div>

          {error ? (
            <p role="alert" className="text-small text-clay">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            type="submit"
            disabled={submitting || password.length < MIN_LENGTH}
          >
            {submitting ? "Criando" : "Criar conta"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/entrar")}
          >
            Já tenho conta
          </Button>
        </div>
      </form>
    </AuthPanel>
  );
}
