import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { adminAccess } from "@/lib/admin/session";
import { sessionProfile } from "@/lib/auth/session";

import { AccessDenied, SignedOut } from "./access-refused";

export const metadata: Metadata = {
  title: "Back office · AVESSO",
  // The panel is not for the public and has no reason to be indexed.
  robots: { index: false, follow: false },
};

/**
 * The gate, and the chrome behind it.
 *
 * `adminAccess()` asks the API a question only an operator can be answered —
 * see src/lib/admin/session.ts for why there is nothing local to read. It runs
 * once per render and is memoised for that render only, so a permission
 * revoked between two page loads bites on the second.
 *
 * This is a gate on the UI. It is not the security boundary and must never be
 * mistaken for one: every route under /api/admin re-asks the backend, which
 * answers 403 or 404 on its own authority. A layout that renders is not
 * permission to write anything.
 *
 * There is no route group. The store's chrome is per-page rather than in the
 * root layout, so this inherits only `<html>` and the two fonts — exactly
 * what the panel wants and nothing it has to undo.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const [access, profile] = await Promise.all([adminAccess(), sessionProfile()]);

  if (access === "signed-out") {
    return <SignedOut />;
  }

  if (access === "denied") {
    return <AccessDenied />;
  }

  // Still no route that reports the signed-in address — there is no /auth/me,
  // and the access token carries only a subject id. What changed is that the
  // address is now recorded at sign-in, in the session profile cookie, so the
  // bar can show the one this browser typed. A session older than that cookie
  // has none, and the bar renders without it rather than inventing one.
  return (
    <AdminShell email={profile?.email ?? null}>{children}</AdminShell>
  );
}
