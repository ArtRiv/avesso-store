"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PlusIcon, TrashIcon } from "@/components/admin-icons";
import { Card, PageHeader } from "@/components/admin/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, problemMessage, SessionEndedError } from "@/lib/api/browser";
import type { components } from "@/lib/api/schema";

type Category = components["schemas"]["CategoryResponse"];
type Product = components["schemas"]["ProductResponse"];

/** The grid a clothing store reaches for first. Editable before creating. */
const DEFAULT_SIZES = ["P", "M", "G", "GG"];

/**
 * The create form.
 *
 * Sizes are sent in display order and their `position` follows the array, so
 * sending P, M, G, GG simply works — the ordering that alphabetical would get
 * wrong (G, GG, M, P) never has to be corrected afterwards.
 *
 * Omitting `variants` entirely would give the product one size labelled
 * `Único`, which is the state the twelve pieces are stuck in today. The form
 * offers a real grid by default precisely so new pieces do not join them, and
 * still allows emptying it for a piece that genuinely has one size.
 */
export function NewProductForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState("");
  const [weight, setWeight] = useState("");
  const [description, setDescription] = useState("");
  const [sizes, setSizes] = useState<string[]>(DEFAULT_SIZES);
  const [newSize, setNewSize] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  const priceCents = centsFrom(price);
  const ready = name.trim().length > 0 && priceCents !== null && priceCents > 0;

  async function create() {
    if (!ready) {
      setError("O nome e um preço maior que zero são obrigatórios.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await apiFetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          priceCents,
          ...(slug.trim() ? { slug: slug.trim() } : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(weightFrom(weight) === null
            ? {}
            : { weightGrams: weightFrom(weight) }),
          ...(categoryIds.length > 0 ? { categoryIds } : {}),
          // Empty means "no grid": the API then creates the single `Único`
          // variant itself rather than this screen inventing one.
          ...(sizes.length > 0
            ? { variants: sizes.map((label) => ({ label, stockQuantity: 0 })) }
            : {}),
        }),
      });

      if (!response.ok) {
        setError(await problemMessage(response));
        return;
      }

      const created = (await response.json()) as Product;
      // Straight into the editor: stock per size, images and publishing all
      // live there, and duplicating any of it here would be a second form for
      // the same product.
      router.push(`/admin/produtos/${created.id}`);
    } catch (caught) {
      setError(
        caught instanceof SessionEndedError
          ? caught.message
          : "Não foi possível criar. Tente novamente em instantes.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Novo produto"
        meta={
          <span className="type-meta text-muted">
            Nasce como rascunho — sai para a loja no editor
          </span>
        }
      >
        <Button size="admin" disabled={!ready || busy} onClick={create}>
          {busy ? "Criando" : "Criar produto"}
        </Button>
      </PageHeader>

      {error ? (
        <p
          role="alert"
          className="border-l-2 border-clay py-3 pl-3.5 text-small text-clay"
        >
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-3 items-start gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          <Card title="Dados">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                autoFocus
                inputSize="admin"
                value={name}
                placeholder="Ex.: Camiseta Pesada Preta"
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                inputSize="admin"
                value={slug}
                placeholder="gerado do nome"
                className="font-mono text-[14px]"
                onChange={(event) => {
                  setSlug(event.target.value);
                }}
              />
              <p className="text-[12px] text-admin-dim">
                Vazio, a API gera do nome e acrescenta um número se colidir.
                Preenchido, um slug já usado é recusado em vez de renomeado.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="price">Preço</Label>
                <Input
                  id="price"
                  inputSize="admin"
                  inputMode="decimal"
                  value={price}
                  placeholder="149,90"
                  className="font-mono tabular-nums"
                  onChange={(event) => {
                    setPrice(event.target.value);
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="weight">Peso (g)</Label>
                <Input
                  id="weight"
                  inputSize="admin"
                  inputMode="numeric"
                  value={weight}
                  placeholder="240"
                  className="font-mono tabular-nums"
                  onChange={(event) => {
                    setWeight(event.target.value);
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                }}
                className="min-h-24 w-full rounded-[2px] border border-hairline bg-paper p-3.5 text-[15px] leading-relaxed outline-none focus-visible:border-ink"
              />
            </div>
          </Card>

          <Card
            title="Tamanhos"
            note="Na ordem em que devem aparecer. A API guarda a posição pela ordem desta lista — alfabético colocaria GG antes de M."
          >
            <div className="flex flex-wrap items-center gap-2">
              {sizes.map((label, index) => (
                <span
                  key={`${label}-${String(index)}`}
                  className="flex h-9 items-center gap-2 border border-admin-hairline px-3 font-mono text-[14px]"
                >
                  {label}
                  <button
                    type="button"
                    aria-label={`Remover ${label}`}
                    onClick={() => {
                      setSizes(sizes.filter((_, i) => i !== index));
                    }}
                    className="text-admin-dim hover:text-clay"
                  >
                    <TrashIcon size={13} />
                  </button>
                </span>
              ))}
              {sizes.length === 0 ? (
                <span className="type-meta text-rust">
                  Sem grade — a peça nasce com um tamanho `Único`
                </span>
              ) : null}
            </div>

            <form
              className="flex items-center gap-2.5"
              onSubmit={(event) => {
                event.preventDefault();
                const label = newSize.trim();

                if (label && !sizes.includes(label)) {
                  setSizes([...sizes, label]);
                  setNewSize("");
                }
              }}
            >
              <Input
                inputSize="admin"
                maxLength={20}
                value={newSize}
                placeholder="XGG"
                aria-label="Novo tamanho"
                className="w-32 font-mono"
                onChange={(event) => {
                  setNewSize(event.target.value);
                }}
              />
              <Button
                type="submit"
                variant="secondary"
                size="admin"
                disabled={newSize.trim() === ""}
              >
                <PlusIcon />
                Acrescentar
              </Button>
            </form>

            <p className="text-[12px] text-admin-dim">
              Todo tamanho nasce com estoque zero, que é um estado real: existe
              e não tem nenhum. O estoque se preenche no editor.
            </p>
          </Card>
        </div>

        <Card title="Categorias" note="Opcional — uma peça sem categoria é válida.">
          <div className="flex flex-wrap gap-2">
            {categories.length === 0 ? (
              <span className="text-[13px] text-admin-dim">
                Nenhuma categoria ainda.
              </span>
            ) : (
              categories.map((category) => {
                const on = categoryIds.includes(category.id);

                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setCategoryIds(
                        on
                          ? categoryIds.filter((id) => id !== category.id)
                          : [...categoryIds, category.id],
                      );
                    }}
                    className={`type-meta border px-2.5 py-1.5 ${
                      on
                        ? "border-ink text-ink"
                        : "border-dashed border-admin-hairline text-admin-dim hover:text-ink"
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

/** Same parsing as the editor: what was typed, into integer cents. */
function centsFrom(text: string): number | null {
  const digits = text.replace(/[^\d,.]/g, "").replace(",", ".");

  if (digits === "") {
    return null;
  }

  const value = Number(digits);

  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

function weightFrom(text: string): number | null {
  const trimmed = text.trim();

  if (trimmed === "") {
    return null;
  }

  const value = Number(trimmed);

  return Number.isInteger(value) && value > 0 ? value : null;
}
