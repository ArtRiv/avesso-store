import type { Metadata } from "next";

import { AuthPageShell } from "@/components/auth-page-shell";
import { safeReturnTo } from "@/lib/auth/return-to";

import { SignInPanel } from "./sign-in-panel";

export const metadata: Metadata = {
  title: "Entrar · AVESSO",
  description: "Entre na sua conta AVESSO.",
};

/**
 * Página dedicada de login.
 *
 * Utilizada para autenticação direta, retornos de e-mails de verificação/recuperação
 * ou quando uma sessão expira durante a navegação.
 *
 * `?next=` define a rota de redirecionamento pós-login (sanitizada para caminhos de mesma origem).
 */
export default async function SignInPage(props: PageProps<"/entrar">) {
  const { next } = await props.searchParams;

  return (
    <AuthPageShell>
      <SignInPanel
        returnTo={safeReturnTo(typeof next === "string" ? next : null)}
      />
    </AuthPageShell>
  );
}
