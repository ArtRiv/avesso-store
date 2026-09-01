"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ImageUrls } from "@/components/admin/image-urls";
import { Card, PageHeader } from "@/components/admin/page-parts";
import { VariantPanel } from "@/components/admin/variant-panel";
import { Badge } from "@/components/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCT_STATUS_LABEL, PRODUCT_STATUS_TONE } from "@/lib/admin/status";
import { apiFetch, problemMessage, SessionEndedError } from "@/lib/api/browser";
import type { components } from "@/lib/api/schema";
import { formatBRL } from "@/lib/format";

type Product = components["schemas"]["ProductResponse"];
type Category = components["schemas"]["CategoryResponse"];
type ProductStatus = Product["status"];

/**
 * The product editor.
 *
 * One save button covers the details card and the categories card, because
 * `PATCH /products/{id}` takes them together and `categoryIds` REPLACES the
 * whole set when present. The sizes panel below saves on its own — every one
 * of its operations is a separate route with its own refusals, and a size
 * removal that rode along with a price change would be a destructive act
 * hidden inside a routine one.
 */
export function ProductEditor({
  product: initial,
  categories,
}: {
  product: Product;
  categories: Category[];
}) {
  const router = useRouter();
  const [product, setProduct] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The edited copy of everything the details card owns. Money is held as the
  // string the operator is typing and converted once, on save — a controlled
  // number input that reformats mid-keystroke fights whoever is using it.
  const [form, setForm] = useState({
    name: initial.name,
    slug: initial.slug,
    status: initial.status,
    price: (initial.priceCents / 100).toFixed(2).replace(".", ","),
    weight: initial.weightGrams === null ? "" : String(initial.weightGrams),
    description: initial.description ?? "",
    categoryIds: initial.categories.map((category) => category.id),
    imageUrls: initial.imageUrls,
  });

  const dirty =
    form.name !== product.name ||
    form.slug !== product.slug ||
    form.status !== product.status ||
    form.description !== (product.description ?? "") ||
    centsFrom(form.price) !== product.priceCents ||
    weightFrom(form.weight) !== product.weightGrams ||
    !sameSet(
      form.categoryIds,
      product.categories.map((category) => category.id),
    ) ||
    // Order matters here, unlike categories: the first url is the cover, so
    // moving one is a real change even when the set is identical.
    form.imageUrls.join("\u0000") !== product.imageUrls.join("\u0000");

  async function save() {
    const priceCents = centsFrom(form.price);

    if (priceCents === null || priceCents < 1) {
      setError("O preço precisa ser maior que zero.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await apiFetch(
        `/api/admin/products/${product.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            slug: form.slug.trim(),
            status: form.status,
            priceCents,
            description: form.description.trim(),
            // Present replaces the whole set, which is what the card's copy
            // says out loud. Absent would leave the associations alone — and
            // that is not what unchecking a category means.
            categoryIds: form.categoryIds,
            // Same rule as categories — present replaces the whole list, which is
            // what removing a photo has to mean.
            imageUrls: form.imageUrls,
            ...(weightFrom(form.weight) === null
              ? {}
              : { weightGrams: weightFrom(form.weight) }),
          }),
        },
      );

      if (!response.ok) {
        setError(await problemMessage(response));
        return;
      }

      setProduct((await response.json()) as Product);
      // The listing behind this page shows name, status, price and sizes.
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof SessionEndedError
          ? caught.message
          : "Não foi possível salvar. Tente novamente em instantes.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={product.name}
        meta={
          <>
            <Badge tone={PRODUCT_STATUS_TONE[product.status]}>
              {PRODUCT_STATUS_LABEL[product.status]}
            </Badge>
            <span className="type-meta text-admin-dim">{product.slug}</span>
          </>
        }
      >
        <Button
          variant="secondary"
          size="admin"
          disabled={product.status === "ARCHIVED"}
          onClick={() => {
            setForm((current) => ({ ...current, status: "ARCHIVED" }));
          }}
        >
          Arquivar
        </Button>
        <Button size="admin" disabled={!dirty || saving} onClick={save}>
          {saving ? "Salvando" : "Salvar"}
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
            <Field label="Nome">
              <Input
                inputSize="admin"
                value={form.name}
                onChange={(event) => {
                  setForm({ ...form, name: event.target.value });
                }}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Slug">
                <Input
                  inputSize="admin"
                  className="font-mono text-[14px]"
                  value={form.slug}
                  onChange={(event) => {
                    setForm({ ...form, slug: event.target.value });
                  }}
                />
              </Field>
              <Field label="Status">
                <StatusSelect
                  value={form.status}
                  onChange={(status) => {
                    setForm({ ...form, status });
                  }}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Preço">
                <Input
                  inputSize="admin"
                  inputMode="decimal"
                  className="font-mono tabular-nums"
                  value={form.price}
                  onChange={(event) => {
                    setForm({ ...form, price: event.target.value });
                  }}
                />
              </Field>
              <Field
                label="Peso (g)"
                hint="Vazio faz o frete cair num padrão que a loja paga quando o chute é baixo."
              >
                <Input
                  inputSize="admin"
                  inputMode="numeric"
                  className="font-mono tabular-nums"
                  value={form.weight}
                  onChange={(event) => {
                    setForm({ ...form, weight: event.target.value });
                  }}
                />
              </Field>
            </div>

            <Field label="Descrição">
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => {
                  setForm({ ...form, description: event.target.value });
                }}
                className="min-h-24 w-full rounded-[2px] border border-hairline bg-paper p-3.5 text-[15px] leading-relaxed outline-none focus-visible:border-ink"
              />
            </Field>
          </Card>

          <VariantPanel
            productId={product.id}
            variants={product.variants}
            totalStock={product.stockQuantity}
            onProductChange={(next) => {
              setProduct(next);
              router.refresh();
            }}
          />
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Imagens">
            <ImageUrls
              urls={form.imageUrls}
              onChange={(imageUrls) => {
                setForm({ ...form, imageUrls });
              }}
            />
          </Card>

          <Card title="Categorias" note="Salvar substitui o conjunto inteiro.">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const on = form.categoryIds.includes(category.id);

                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setForm({
                        ...form,
                        categoryIds: on
                          ? form.categoryIds.filter((id) => id !== category.id)
                          : [...form.categoryIds, category.id],
                      });
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
              })}
            </div>
          </Card>

          <Card title="Histórico">
            <Row label="Criado" value={shortDate(product.createdAt)} />
            <Row label="Atualizado" value={shortDate(product.updatedAt)} />
            <Row
              label="Preço atual"
              value={formatBRL(product.priceCents)}
              mono
            />
          </Card>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-[12px] text-admin-dim">{hint}</p> : null}
    </div>
  );
}

/**
 * The three statuses. There is no separate publish route upstream — ACTIVE is
 * reached through this field — and the select says so by being the only way.
 */
function StatusSelect({
  value,
  onChange,
}: {
  value: ProductStatus;
  onChange: (value: ProductStatus) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => {
        onChange(event.target.value as ProductStatus);
      }}
      className="h-11 w-full cursor-pointer appearance-none rounded-[2px] border border-hairline bg-paper px-3.5 text-[15px] outline-none focus-visible:border-ink"
    >
      {(["DRAFT", "ACTIVE", "ARCHIVED"] as const).map((status) => (
        <option key={status} value={status}>
          {PRODUCT_STATUS_LABEL[status]}
        </option>
      ))}
    </select>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[13px] text-muted">{label}</span>
      <span className={mono ? "font-mono text-[13px] tabular-nums" : "text-[13px]"}>
        {value}
      </span>
    </div>
  );
}

const shortFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function shortDate(iso: string): string {
  return shortFormatter.format(new Date(iso));
}

/**
 * `R$ 79,90` or `79,90` or `79.90` to integer cents.
 *
 * This is parsing what an operator typed, not arithmetic on money: the value
 * that leaves here is cents, the value that arrives is cents, and nothing in
 * between adds two prices together. Returns null when the text is not a
 * number at all, which the caller refuses to save.
 */
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

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}
