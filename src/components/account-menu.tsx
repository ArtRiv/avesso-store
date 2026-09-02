"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";

import { AccountIcon } from "@/components/icons";
import { textLinkClass } from "@/components/text-link";
import { cn } from "@/lib/utils";

/**
 * `Conta` in the header, as a menu rather than a link.
 *
 * It was a link straight to /minha-conta/pedidos, which is why the store had no
 * way to sign out and no way into the back office — the one control that should
 * have offered both went somewhere else instead. This is that control.
 *
 * Only rendered with a session. Signed out, the header keeps a plain link to
 * /entrar: a menu whose only entry is "sign in" is a worse link.
 */
export function AccountMenu({
  email,
  backOffice,
}: {
  /**
   * The address typed at sign-in, or null for a session that predates the
   * profile cookie. There is no route that reports a name — see
   * `SessionProfile` — so this shows an address or nothing, never a guess.
   */
  email: string | null;
  /** Whether to offer the back office. Decided at sign-in; see below. */
  backOffice: boolean;
}) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function signOut() {
    setLeaving(true);

    // The route answers 204 whatever the backend said — the cookies go either
    // way — so there is nothing here to branch on and nothing to report.
    await fetch("/api/auth/logout", { method: "POST" });

    // Home rather than in place: half the store's pages have no meaning without
    // a session, and staying on one only to be bounced is a worse goodbye.
    router.push("/");
    // The header, the sacola count and every server component still hold the
    // signed-in render. Without this they keep it until something else
    // navigates.
    router.refresh();
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(textLinkClass, "type-meta flex items-center gap-2")}
      >
        <AccountIcon />
        Conta
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        {/* §7: no rounded corner and no shadow. A hairline box on paper, which
            is what every other surface in this design is. */}
        <DropdownMenu.Content
          align="end"
          sideOffset={12}
          className="min-w-56 border border-ink bg-paper py-1 outline-none"
        >
          {email ? (
            <>
              <div className="px-4 py-2.5">
                <p className="type-meta text-muted">Conectado como</p>
                <p className="truncate text-[14px] text-ink">{email}</p>
              </div>
              <DropdownMenu.Separator className="my-1 h-px bg-hairline" />
            </>
          ) : null}

          <Item href="/minha-conta/pedidos">Meus pedidos</Item>

          {/* Drawn from the session profile rather than from a live check: the
              header renders on every page of the store, and asking the API each
              time to decide whether one entry appears is a request per
              navigation. The entry is an offer, never a permission — /admin
              re-asks on render and refuses on its own authority, so a stale
              yes costs a refusal screen and a stale no costs nothing but the
              shortcut. */}
          {backOffice ? <Item href="/admin/produtos">Back office</Item> : null}

          <DropdownMenu.Separator className="my-1 h-px bg-hairline" />

          <DropdownMenu.Item
            disabled={leaving}
            onSelect={(event) => {
              // Radix closes the menu on select, which unmounts this before the
              // request lands. Keep it open until the navigation happens.
              event.preventDefault();
              void signOut();
            }}
            className={ITEM_CLASS}
          >
            {leaving ? "Saindo" : "Sair"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const ITEM_CLASS = cn(
  "cursor-pointer px-4 py-2.5 text-[14px] text-ink outline-none",
  "data-[highlighted]:text-rust data-[disabled]:cursor-default data-[disabled]:text-muted",
);

function Item({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <DropdownMenu.Item asChild className={ITEM_CLASS}>
      <Link href={href}>{children}</Link>
    </DropdownMenu.Item>
  );
}
