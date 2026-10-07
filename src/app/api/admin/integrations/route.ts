import { withAdminApi } from "@/lib/admin/route";
 import { unwrap } from "@/lib/api/client";

const COPY = {
  401: "Sessão expirada.",
  403: "Sem permissão para consultar integrações.",
} as const;

export async function GET() {
  return withAdminApi(COPY, async (api) => {
    return unwrap(await api.GET("/integrations"));
  });
}
