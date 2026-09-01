"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { ChevronIcon, SearchIcon } from "@/components/icons";

/**
 * Search, status and ordering — all three writing to the query string, so the
 * listing itself stays a server component and a filtered view is a URL an
 * operator can keep.
 *
 * The status filter is the one the API gates: it REQUIRES `products.read` and
 * answers 403 without it. The canvas notes that on the screen, and the note
 * stays — it explains why this control exists here and nowhere in the store.
 */
export function ProductFilters({
  search,
  status,
  sort,
  statuses,
  sorts,
}: {
  search: string;
  status: string;
  sort: string;
  statuses: Readonly<Record<string, string>>;
  sorts: Readonly<Record<string, string>>;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function commit(next: Record<string, string>) {
    const query = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(next)) {
      if (value) {
        query.set(key, value);
      } else {
        query.delete(key);
      }
    }

    // Any change to the filters invalidates the page number: page 3 of the old
    // result set is a different set of pieces, or nothing at all.
    query.delete("page");
    router.push(`?${query.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Uncontrolled, and keyed on the committed term. The key is what makes
          the box follow the URL when it changes underneath — a back button, or
          a status change that rebuilds the query — without a controlled value
          and an effect to re-sync it. React throws the input away and mounts a
          fresh one with the new default. */}
      <form
        key={search}
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get("q");
          commit({ q: typeof value === "string" ? value.trim() : "" });
        }}
        className="flex h-10 w-80 items-center gap-2.5 border border-admin-hairline bg-paper px-3.5 focus-within:border-ink"
      >
        <SearchIcon className="size-4 shrink-0 text-admin-dim" />
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Buscar por nome"
          aria-label="Buscar por nome"
          className="w-full bg-transparent text-[14px] outline-none placeholder:text-admin-dim"
        />
      </form>

      <Select
        label="Status"
        value={status}
        options={statuses}
        onChange={(value) => {
          commit({ status: value });
        }}
      />
      <Select
        label="Ordem"
        value={sort}
        options={sorts}
        onChange={(value) => {
          commit({ sort: value });
        }}
      />

      <span className="ml-auto type-meta text-admin-dim">
        Filtrar por status exige products.read
      </span>
    </div>
  );
}

/**
 * A native `select` wearing the canvas's box.
 *
 * Native rather than a Radix menu on purpose: the design draws a bordered
 * field with a chevron and no custom popup, and the platform control is
 * already correct on a keyboard, on a screen reader and on a phone. A
 * re-implementation would be more code that does less.
 *
 * The chevron is drawn rather than inherited: `appearance-none` takes the
 * browser's own arrow away, and without a replacement the field reads as a
 * caption, not as something that opens. That is how the status filter came to
 * be reported missing when it had been on the screen all along — the store
 * side already draws it in `catalog-controls.tsx`, and this matches it.
 */
function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Readonly<Record<string, string>>;
  onChange: (value: string) => void;
}) {
  const active = value !== Object.keys(options)[0];

  return (
    <label
      className={`relative flex h-10 items-center gap-2.5 border bg-paper px-3.5 focus-within:border-ink ${
        active ? "border-ink" : "border-admin-hairline"
      }`}
    >
      <span className="type-meta text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="cursor-pointer appearance-none bg-transparent pr-6 text-[14px] outline-none"
      >
        {Object.entries(options).map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
      <ChevronIcon className="pointer-events-none absolute right-3.5 text-admin-dim" />
    </label>
  );
}
