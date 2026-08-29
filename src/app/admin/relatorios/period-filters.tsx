"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { GRANULARITY_LABEL, type Granularity } from "@/lib/admin/reports";

/**
 * The window and the bucket size, both written to the query string — so a
 * period is a URL an operator can keep, mail to someone, and open next month
 * to the same numbers.
 *
 * The dates are typed. There are no `Este mês` / `Mês passado` presets, and
 * their absence is deliberate rather than unfinished: a preset would have to
 * work out where the month starts, and the browser would work that out in the
 * *reader's* time zone while the API cuts its buckets in the instance's. An
 * operator in Lisbon would get a different "this month" than the store's own
 * books. `Últimos 30 dias` is the one shortcut, and it is safe because it
 * computes nothing — it clears both fields and lets the API apply its own
 * default in its own zone.
 */
export function PeriodFilters({
  from,
  to,
  granularity,
}: {
  from: string;
  to: string;
  granularity: Granularity;
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

    // Both tables are paginated against the old window. Page 3 of a different
    // period is a different set of pieces, or nothing at all.
    query.delete("pageVendas");
    query.delete("pageParadas");

    const search = query.toString();
    router.push(search ? `?${search}` : "?");
  }

  const custom = from !== "" || to !== "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <form
          // Keyed on the committed window so the two boxes follow the URL when
          // it changes underneath them — a back button, or the reset link —
          // without a controlled value and an effect to re-sync it.
          key={`${from}|${to}`}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            commit({
              from: String(data.get("from") ?? ""),
              to: String(data.get("to") ?? ""),
            });
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <DateField name="from" label="De" defaultValue={from} />
          <DateField name="to" label="Até (exclusivo)" defaultValue={to} />
          <Button type="submit" size="admin" variant="secondary">
            Aplicar
          </Button>
        </form>

        <label className="flex h-10 items-center gap-2.5 border border-admin-hairline bg-paper px-3.5 focus-within:border-ink">
          <span className="type-meta text-muted">Buckets</span>
          <select
            value={granularity}
            onChange={(event) => {
              commit({ granularity: event.target.value });
            }}
            className="cursor-pointer appearance-none bg-transparent pr-1 text-[14px] outline-none"
          >
            {Object.entries(GRANULARITY_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {custom ? (
          <Button
            type="button"
            size="admin"
            variant="ghost"
            className="ml-auto"
            onClick={() => {
              commit({ from: "", to: "" });
            }}
          >
            Últimos 30 dias
          </Button>
        ) : null}
      </div>

      <p className="text-[13px] text-muted">
        O fim não entra na conta. Para fechar agosto inteiro, peça de 01/08 a
        01/09. Com os dois campos vazios, a janela são os 30 dias até agora,
        contados pela API.
      </p>
    </div>
  );
}

function DateField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="type-meta text-muted">{label}</span>
      <input
        type="date"
        name={name}
        defaultValue={defaultValue}
        className="h-10 w-[190px] border border-admin-hairline bg-paper px-3.5 font-mono text-[14px] tabular-nums outline-none focus:border-ink"
      />
    </label>
  );
}
