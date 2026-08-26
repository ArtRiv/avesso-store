import type { Metadata } from "next";

import { AuthPageShell } from "@/components/auth-page-shell";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Nova senha · AVESSO",
  description: "Defina uma nova senha para sua conta AVESSO.",
  // A single-use token sits in this URL.
  robots: { index: false, follow: false },
};

/**
 * Where the password-reset e-mail lands:
 * `${APP_URL}/reset-password?token=…`, built by the backend's mail service.
 * The token is single-use and expires after an hour.
 */
export default async function ResetPasswordPage(
  props: PageProps<"/reset-password">,
) {
  const { token } = await props.searchParams;

  return (
    <AuthPageShell>
      <ResetPasswordForm token={typeof token === "string" ? token : null} />
    </AuthPageShell>
  );
}
