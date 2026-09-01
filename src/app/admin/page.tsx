import { redirect } from "next/navigation";

/**
 * The panel has no dashboard, so /admin is not a page — it is a doorway.
 *
 * The canvas draws six screens and none of them is a home. Inventing one would
 * mean inventing its content, and a home whose content is invented is worse
 * than arriving where the work starts.
 *
 * The numbers a dashboard would have wanted now exist — `reports.read` has
 * four routes behind it, and /admin/relatorios reads them. That screen is a
 * destination in the rail rather than a doorway, because a period is something
 * an operator chooses; landing on one would be choosing it for them.
 */
export default function AdminIndex(): never {
  redirect("/admin/produtos");
}
