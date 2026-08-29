"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PencilIcon, TrashIcon } from "@/components/admin-icons";
import { Card, TableFrame, Td, Th, Tr } from "@/components/admin/page-parts";
import { DeleteCategoryDialog } from "@/components/admin/delete-category-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, problemMessage, SessionEndedError } from "@/lib/api/browser";
import type { components } from "@/lib/api/schema";

type Category = components["schemas"]["CategoryResponse"];

/**
 * The category table and the form that adds to it.
 *
 * Every write re-reads through `router.refresh()` rather than patching a local
 * copy. The counts beside each row come from a different endpoint than the
 * categories themselves, so a local edit would have to guess whether a rename
 * changed a count — it does not, but a delete changes the list and a create
 * changes it too, and one path that always re-reads is simpler than three that
 * each decide.
 */
export function CategoriesView({
  categories,
  counts,
}: {
  categories: Category[];
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(path: string, init: RequestInit): Promise<boolean> {
    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch(path, init);

      if (!response.ok) {
        setError(await problemMessage(response));
        return false;
      }

      router.refresh();
      return true;
    } catch (caught) {
      setError(
        caught instanceof SessionEndedError
          ? caught.message
          : "Não foi possível concluir. Tente novamente em instantes.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {error ? (
        <p
          role="alert"
          className="border-l-2 border-clay py-3 pl-3.5 text-small text-clay"
        >
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-[2fr_1fr] items-start gap-6">
        <TableFrame>
          <thead>
            <Tr>
              <Th>Nome</Th>
              <Th>Slug</Th>
              <Th className="w-[100px] text-right">Peças</Th>
              <Th className="w-20" />
            </Tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-12 text-center text-small text-muted"
                >
                  Nenhuma categoria ainda. A primeira entra pelo formulário ao
                  lado.
                </td>
              </tr>
            ) : (
              categories.map((category) =>
                editing === category.id ? (
                  <EditRow
                    key={category.id}
                    category={category}
                    busy={busy}
                    onCancel={() => {
                      setEditing(null);
                    }}
                    onSave={async (patch) => {
                      const ok = await send(
                        `/api/admin/categories/${category.id}`,
                        {
                          method: "PATCH",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify(patch),
                        },
                      );

                      if (ok) {
                        setEditing(null);
                      }
                    }}
                  />
                ) : (
                  <Tr key={category.id}>
                    <Td className="text-[15px]">{category.name}</Td>
                    <Td className="font-mono text-[13px] text-muted">
                      {category.slug}
                    </Td>
                    <Td
                      className={`text-right font-mono text-[14px] tabular-nums ${
                        counts[category.id] === 0 ? "text-admin-dim" : ""
                      }`}
                    >
                      {counts[category.id] ?? 0}
                    </Td>
                    <Td>
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          aria-label={`Renomear ${category.name}`}
                          disabled={busy}
                          onClick={() => {
                            setError(null);
                            setEditing(category.id);
                          }}
                          className="text-muted outline-none hover:text-ink focus-visible:outline-1 focus-visible:outline-ink disabled:text-admin-hairline"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          aria-label={`Apagar ${category.name}`}
                          disabled={busy}
                          onClick={() => {
                            setError(null);
                            setDeleting(category);
                          }}
                          className="text-muted outline-none hover:text-clay focus-visible:outline-1 focus-visible:outline-ink disabled:text-admin-hairline"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ),
              )
            )}
          </tbody>
        </TableFrame>

        <NewCategory
          busy={busy}
          onCreate={(body) =>
            send("/api/admin/categories", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(body),
            })
          }
        />
      </div>

      {deleting ? (
        <DeleteCategoryDialog
          key={deleting.id}
          name={deleting.name}
          pieceCount={counts[deleting.id] ?? 0}
          open
          busy={busy}
          onOpenChange={(next) => {
            if (!next) {
              setDeleting(null);
            }
          }}
          onConfirm={async () => {
            const ok = await send(`/api/admin/categories/${deleting.id}`, {
              method: "DELETE",
            });

            if (ok) {
              setDeleting(null);
            }
          }}
        />
      ) : null}
    </>
  );
}

/** The row, turned into two fields. Slug is editable — it is a real column. */
function EditRow({
  category,
  busy,
  onCancel,
  onSave,
}: {
  category: Category;
  busy: boolean;
  onCancel: () => void;
  onSave: (patch: { name: string; slug: string }) => Promise<void>;
}) {
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);

  return (
    <Tr className="bg-[#FAF9F7]">
      <Td>
        <Input
          autoFocus
          inputSize="admin-sm"
          value={name}
          aria-label="Nome"
          onChange={(event) => {
            setName(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel();
          }}
        />
      </Td>
      <Td>
        <Input
          inputSize="admin-sm"
          value={slug}
          aria-label="Slug"
          className="font-mono text-[13px]"
          onChange={(event) => {
            setSlug(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel();
          }}
        />
      </Td>
      <Td />
      <Td>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            disabled={busy || name.trim() === ""}
            onClick={() => {
              void onSave({ name: name.trim(), slug: slug.trim() });
            }}
            className="type-meta text-[11px] hover:text-rust disabled:text-admin-dim"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="type-meta text-[11px] text-muted hover:text-rust"
          >
            Cancelar
          </button>
        </div>
      </Td>
    </Tr>
  );
}

/**
 * The create form.
 *
 * Slug is left empty by default and the placeholder says why: the API
 * generates one from the name, adding a numeric suffix if it collides. Typing
 * one asks for that exact slug, and a taken one is a 409 rather than a silent
 * rename.
 */
function NewCategory({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (body: {
    name: string;
    slug?: string;
    description?: string;
  }) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  return (
    <Card title="Nova categoria">
      <form
        className="flex flex-col gap-5"
        onSubmit={async (event) => {
          event.preventDefault();

          const created = await onCreate({
            name: name.trim(),
            ...(slug.trim() ? { slug: slug.trim() } : {}),
            ...(description.trim() ? { description: description.trim() } : {}),
          });

          if (created) {
            setName("");
            setSlug("");
            setDescription("");
          }
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="category-name">Nome</Label>
          <Input
            id="category-name"
            inputSize="admin"
            value={name}
            placeholder="Ex.: Camisas"
            onChange={(event) => {
              setName(event.target.value);
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="category-slug">Slug</Label>
          <Input
            id="category-slug"
            inputSize="admin"
            value={slug}
            placeholder="gerado do nome"
            className="font-mono text-[14px]"
            onChange={(event) => {
              setSlug(event.target.value);
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="category-description">Descrição</Label>
          <textarea
            id="category-description"
            rows={3}
            value={description}
            placeholder="Opcional"
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            className="min-h-20 w-full rounded-[2px] border border-hairline bg-paper p-3.5 text-[15px] leading-relaxed outline-none placeholder:text-admin-dim focus-visible:border-ink"
          />
        </div>

        <Button
          type="submit"
          size="admin-lg"
          className="w-full"
          disabled={busy || name.trim() === ""}
        >
          {busy ? "Criando" : "Criar"}
        </Button>

        <p className="text-[12px] leading-relaxed text-admin-dim">
          Apagar uma categoria solta as peças dela. As peças continuam
          existindo.
        </p>
      </form>
    </Card>
  );
}
