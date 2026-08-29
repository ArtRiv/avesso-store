import Link from "next/link";

import { BackOfficeIcon } from "@/components/admin-icons";
import { Button } from "@/components/ui/button";

/**
 * The two ways in which the panel does not open.
 *
 * Both are quiet, and neither accuses anyone. A customer who follows a link to
 * /admin has done nothing wrong, and copy that treated the visit as an
 * intrusion would be both rude and a small confirmation that something worth
 * guarding is here.
 */
function Refusal({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-grow items-center justify-center bg-admin-bg px-6">
      <div className="flex w-full max-w-[420px] flex-col gap-6 border border-admin-hairline bg-paper p-10">
        <BackOfficeIcon className="text-muted" />
        <div className="flex flex-col gap-3">
          <h1 className="font-heading text-h3">{title}</h1>
          <p className="text-small text-muted">{children}</p>
        </div>
        {action}
      </div>
    </div>
  );
}

export function SignedOut() {
  return (
    <Refusal
      title="Entre para abrir o painel"
      action={
        <Button asChild size="admin" className="self-start">
          <Link href="/entrar?next=/admin/produtos">Entrar</Link>
        </Button>
      }
    >
      A sessão expirou ou nunca começou. O painel abre com a mesma conta da
      loja, desde que ela tenha permissão de catálogo.
    </Refusal>
  );
}

export function AccessDenied() {
  return (
    <Refusal
      title="Esta conta não abre o painel"
      action={
        <Button asChild variant="secondary" size="admin" className="self-start">
          <Link href="/">Voltar para a loja</Link>
        </Button>
      }
    >
      O painel exige permissões de catálogo e de pedidos, que são concedidas
      direto no banco — não há tela que as conceda, aqui nem na API. Se esta
      conta deveria ter acesso, quem administra a loja precisa promovê-la.
    </Refusal>
  );
}
