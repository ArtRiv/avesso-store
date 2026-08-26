import type { Metadata } from "next";

import { AuthPageShell } from "@/components/auth-page-shell";
import { safeReturnTo } from "@/lib/auth/return-to";

import { SignInPanel } from "./sign-in-panel";

export const metadata: Metadata = {
  title: "Entrar · AVESSO",
  description: "Entre na sua conta AVESSO.",
};

/**
 * The standalone sign-in page.
 *
 * It has no artboard of its own — artboard 05 puts sign-in *inside* the PDP,
 * where the whole point is that the page does not navigate. This page exists
 * for the other way in: the links in the verification and reset e-mails, and
 * anywhere a session ends mid-visit. Same panel either way.
 *
 * `?next=` is where to go afterwards, reduced to a same-origin path first so
 * this cannot be pointed at someone else's domain.
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
