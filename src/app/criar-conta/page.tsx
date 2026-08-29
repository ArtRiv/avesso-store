import type { Metadata } from "next";

import { AuthPageShell } from "@/components/auth-page-shell";

import { CreateAccountPanel } from "./create-account-panel";

export const metadata: Metadata = {
  title: "Criar conta · AVESSO",
  description: "Crie sua conta AVESSO.",
};

export default function CreateAccountPage() {
  return (
    <AuthPageShell>
      <CreateAccountPanel />
    </AuthPageShell>
  );
}
