import { withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";

/**
 * What is sitting in shopping bags right now.
 *
 * A snapshot with no period, because a bag has no history — only a present.
 * It is the one report that cannot answer 400: there is no window to get
 * wrong.
 *
 * The screen renders this server-side and does not go through here. The route
 * exists so the boundary is a real HTTP fact rather than a hidden link — a
 * customer asking for it is answered 403 by the panel gate, and an operator
 * without `reports.read` is answered 403 by the backend on its own authority.
 */
const COPY = {
  403: "Esta conta não tem permissão de relatórios.",
} as const;

export function GET() {
  return withAdminApi(COPY, async (api) =>
    unwrap(await api.GET("/reports/carts")),
  );
}
