import { withAdminApi } from "@/lib/admin/route";
import { unwrap } from "@/lib/api/client";

const COPY = {
  401: "Sessão expirada.",
  403: "Sem permissão para desconectar integrações.",
} as const;

export async function POST() {
  return withAdminApi(COPY, async (api) => {
    return unwrap(await api.POST("/integrations/amazon/disconnect"));
  });
}
