import { redirect } from "next/navigation";

/**
 * The panel has no dashboard, so /admin is not a page — it is a doorway.
 *
 * The canvas draws six screens and none of them is a home. Inventing one would
 * mean inventing its content, and the only numbers worth putting on it —
 * revenue, orders today — come from `reports.read`, a permission with no route
 * behind it. Produtos is where the work starts.
 */
export default function AdminIndex(): never {
  redirect("/admin/produtos");
}
