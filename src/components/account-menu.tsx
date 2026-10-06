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
  name,
  email,
  backOffice,
}: {
  /**
   * The user's name if available, or null.
   */
  name?: string | null;
  /**
   * The address typed at sign-in, or null for a session that predates the
   * profile cookie.
   */
  email: string | null;
  /** Whether to offer the back office. Decided at sign-in; see below. */
  backOffice: boolean;
}) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function signOut() {
    setLeaving(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Falha de rede: prosseguir com o logout local de qualquer forma.
    } finally {
      setLeaving(false);
    }

    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(textLinkClass, "type-meta flex items-center gap-2")}
      >
        <AccountIcon />
        <span className="hidden md:inline">
          {name ? name.split(" ")[0] : "Conta"}
        </span>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={12}
          className="min-w-56 border border-ink bg-paper py-1 outline-none"
        >
          {name || email ? (
            <>
              <div className="px-4 py-2.5">
                <p className="type-meta text-muted">Conectado como</p>
                {name ? (
                  <p className="truncate text-[14px] font-medium text-ink">
                    {name}
                  </p>
                ) : null}
                {email ? (
                  <p className="truncate text-[13px] text-muted">{email}</p>
                ) : null}
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
