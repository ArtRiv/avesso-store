"use client";

import { useState } from "react";

import { PlusIcon, TrashIcon } from "@/components/admin-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * The product's photographs, as the API stores them: a list of plain URLs.
 *
 * There is no upload here and there is not meant to be one. `imageUrls` is a
 * list of strings the API never fetches, validates or hosts — that is recorded
 * upstream as out of scope since v1, and the reasoning holds: an endpoint that
 * accepts files puts the API in the business of judging type, size and content.
 * If uploading ever lands, the shape is a signed URL straight to storage, and
 * this component keeps working unchanged because the field stays a URL.
 *
 * ## Order is meaning
 *
 * The FIRST url is the one every grid, every order line and every listing
 * shows. So this reorders, and says which one is the cover rather than leaving
 * it to be discovered — a photo list where position matters silently is one
 * where somebody eventually wonders why the catalogue is showing the back of
 * a shirt.
 */
const MAX = 20;

export function ImageUrls({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    const value = draft.trim();

    if (value === "") {
      return;
    }

    if (!/^https?:\/\/\S+$/i.test(value)) {
      setError("Precisa ser uma URL http ou https.");
      return;
    }

    if (urls.includes(value)) {
      setError("Esta URL já está na lista.");
      return;
    }

    if (urls.length >= MAX) {
      setError(`A API aceita no máximo ${String(MAX)} imagens.`);
      return;
    }

    setError(null);
    setDraft("");
    onChange([...urls, value]);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= urls.length) {
      return;
    }

    const next = [...urls];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-4">
      {urls.length > 0 ? (
        <ul className="flex flex-col gap-2.5">
          {urls.map((url, index) => (
            <li
              key={url}
              className="flex items-start gap-3 border border-admin-hairline p-2.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="aspect-4/5 w-12 shrink-0 border border-admin-hairline bg-warm object-cover"
              />

              <div className="flex min-w-0 flex-grow flex-col gap-1.5">
                {index === 0 ? (
                  <span className="type-meta text-[10px] text-moss">Capa</span>
                ) : null}
                {/*
                  `break-all` because a URL has no spaces to wrap at, and one
                  long enough would otherwise push the card sideways.
                */}
                <span className="font-mono text-[11px] break-all text-muted">
                  {url}
                </span>
              </div>

              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  aria-label="Mover para cima"
                  disabled={index === 0}
                  onClick={() => {
                    move(index, index - 1);
                  }}
                  className="type-meta text-[11px] text-muted hover:text-ink disabled:text-admin-hairline"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Mover para baixo"
                  disabled={index === urls.length - 1}
                  onClick={() => {
                    move(index, index + 1);
                  }}
                  className="type-meta text-[11px] text-muted hover:text-ink disabled:text-admin-hairline"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remover imagem ${String(index + 1)}`}
                  onClick={() => {
                    onChange(urls.filter((_, i) => i !== index));
                  }}
                  className="text-muted hover:text-clay"
                >
                  <TrashIcon size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border border-dashed border-admin-hairline px-3 py-6 text-center text-[13px] text-admin-dim">
          Sem foto. A peça aparece como bloco de cor até a primeira entrar.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Input
            inputSize="admin-sm"
            value={draft}
            placeholder="Colar URL da imagem"
            aria-label="URL da imagem"
            aria-invalid={error !== null}
            className="font-mono text-[13px]"
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              // Enter adds the URL rather than submitting whatever form this
              // card happens to sit inside — the editor saves with its own
              // button, and a stray Enter should not send the whole product.
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="admin"
            disabled={draft.trim() === ""}
            onClick={add}
          >
            <PlusIcon />
          </Button>
        </div>

        {error ? <p className="text-[12px] text-clay">{error}</p> : null}
      </div>

      <p className="text-[12px] leading-relaxed text-admin-dim">
        A API guarda a URL e não hospeda nada — a imagem tem que viver em outro
        lugar. A primeira da lista é a que aparece na vitrine.
      </p>
    </div>
  );
}
