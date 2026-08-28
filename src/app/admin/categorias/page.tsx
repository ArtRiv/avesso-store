import { PageHeader } from "@/components/admin/page-parts";

/**
 * Placeholder. Categories are the last of the six screens by value — the
 * catalogue works without editing them — and this exists so the rail does not
 * link to a 404 while the screens above it are built.
 */
export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Categorias" />
      <p className="max-w-prose text-small text-muted">
        Em construção. A API já tem o CRUD completo — `GET`, `POST`, `PATCH` e
        `DELETE` em <span className="font-mono text-[13px]">/categories</span> —
        então esta tela é trabalho de front-end, não lacuna de contrato.
      </p>
    </>
  );
}
