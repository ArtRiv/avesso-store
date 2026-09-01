"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BackOfficeIcon,
  CategoriesIcon,
  OrdersIcon,
  ProductsIcon,
  ReportsIcon,
} from "@/components/admin-icons";
import { cn } from "@/lib/utils";

/**
 * The chrome every panel screen sits in: a 64px bar and a 240px rail.
 *
 * Two groups, no dashboard. The canvas has no home for the panel and this does
 * not invent one — `/admin` redirects to Produtos, because a landing page with
 * nothing on it is worse than arriving somewhere useful.
 *
 * Relatórios was absent while the canvas's own note held: "the permissions
 * exist, the routes do not, and drawing those screens now would be the design
 * dictating the contract." The four routes behind `reports.read` are deployed
 * now, so the screen exists and the link is here. Clientes and Acesso are
 * still absent, for exactly the reason that note gives.
 *
 * The link shows for anyone the panel let in, including an operator who holds
 * catalogue and orders but not `reports.read`. That is on purpose: the screen
 * says so plainly when the API refuses, and a hidden link has never been what
 * protected anything — every one of those four routes re-asks the backend.
 */
const SECTIONS = [
  {
    label: "Catálogo",
    items: [
      { href: "/admin/produtos", label: "Produtos", Icon: ProductsIcon },
      { href: "/admin/categorias", label: "Categorias", Icon: CategoriesIcon },
    ],
  },
  {
    label: "Vendas",
    items: [
      { href: "/admin/pedidos", label: "Pedidos", Icon: OrdersIcon },
      { href: "/admin/relatorios", label: "Relatórios", Icon: ReportsIcon },
    ],
  },
] as const;

export function AdminShell({
  email,
  children,
}: {
  /**
   * Shown in the bar, and the only thing the panel knows about who is signed
   * in — there is no route that reports a name, and the token carries only a
   * subject id. The canvas draws a role chip beside it; that chip would be a
   * guess, so it says `Operador`, which is what holding `products.read` and
   * `orders.read` actually makes someone. It is not read from anywhere.
   */
  email: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-admin-bg">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-admin-hairline bg-paper px-8">
        <div className="flex items-center gap-4">
          <BackOfficeIcon className="text-ink" />
          <span className="type-meta tracking-[0.22em]">Back office</span>
          <span className="h-5 w-px bg-admin-hairline" />
          <Link href="/" className="type-meta text-muted hover:text-rust">
            AVESSO
          </Link>
        </div>
        <div className="flex items-center gap-6">
          {email ? (
            <span className="type-meta text-muted normal-case tracking-normal">
              {email}
            </span>
          ) : null}
          <span className="type-meta border border-admin-hairline px-2 py-1 text-muted">
            Operador
          </span>
        </div>
      </header>

      <div className="flex flex-grow items-stretch">
        <nav
          aria-label="Seções do painel"
          className="flex w-60 shrink-0 flex-col gap-8 border-r border-admin-hairline bg-paper py-8"
        >
          {SECTIONS.map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              <h2 className="type-meta px-6 pb-2 text-admin-dim">
                {section.label}
              </h2>
              {section.items.map((item) => (
                <RailLink key={item.href} {...item} />
              ))}
            </div>
          ))}
        </nav>

        <main className="flex flex-grow flex-col gap-7 px-12 pt-8 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}

function RailLink({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: (props: { className?: string }) => React.ReactElement;
}) {
  const pathname = usePathname();
  // Prefix rather than equality: the product editor lives under
  // /admin/produtos/[id] and has to keep Produtos lit while it is open.
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 border-l-2 px-6 py-2.5 text-[14px] leading-tight",
        active
          ? "border-ink bg-admin-bg font-medium text-ink"
          : "border-transparent text-muted hover:text-ink",
      )}
    >
      <Icon className={active ? "text-ink" : "text-muted"} />
      {label}
    </Link>
  );
}
