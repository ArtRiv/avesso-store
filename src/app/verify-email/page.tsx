import type { Metadata } from "next";

import { AuthPageShell } from "@/components/auth-page-shell";

import { VerifyEmailForm } from "./verify-email-form";

export const metadata: Metadata = {
  title: "Confirmar e-mail · AVESSO",
  description: "Confirmação do endereço de e-mail da sua conta AVESSO.",
  // A single-use token sits in this URL. Keeping it out of search results is
  // the least this page can do about that.
  robots: { index: false, follow: false },
};

/**
 * Where the verification e-mail lands: `${APP_URL}/verify-email?token=…`, built
 * by the backend's mail service. Registration cannot complete without this
 * page, because password login stays closed until the address is confirmed.
 *
 * `searchParams` is a Promise in Next 16. Reading it here and handing the
 * token down as a prop keeps the client component free of `useSearchParams`,
 * which would otherwise drag a Suspense boundary along with it.
 */
export default async function VerifyEmailPage(
  props: PageProps<"/verify-email">,
) {
  const { token } = await props.searchParams;

  return (
    <AuthPageShell>
      <VerifyEmailForm token={typeof token === "string" ? token : null} />
    </AuthPageShell>
  );
}
