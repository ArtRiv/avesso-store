import type { Metadata } from "next";

import { requireAdminApi } from "@/lib/admin/session";
import { unwrap } from "@/lib/api/client";

import type { components } from "@/lib/api/schema";

import { IntegrationsView } from "./integrations-view";

export const metadata: Metadata = {
  title: "Integrações · AVESSO Back office",
};

type IntegrationItem = components["schemas"]["IntegrationItemResponse"];

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const api = await requireAdminApi();

  let integrations: IntegrationItem[] = [];

  try {
    const data = unwrap(await api.GET("/integrations"));
    integrations = data.integrations;
  } catch {
    integrations = [];
  }

  return (
    <IntegrationsView
      integrations={integrations}
      initialConnected={connected ?? false}
      initialError={error ?? null}
    />
  );
}
