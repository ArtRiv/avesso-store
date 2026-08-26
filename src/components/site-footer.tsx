import { TextLink } from "@/components/text-link";
import { listCategories } from "@/lib/catalog";

/**
 * docs/design-system.md §5. Four columns, then a hairline, then the legal line
 * and the payment methods in meta.
 *
 * The Loja column is the live category list; the other three are editorial and
 * belong to the store, not the API. Their destinations do not exist yet — this
 * build is the purchase path, and Trocas e devoluções is not on it — so they
 * are plain text rather than links to a 404. A footer full of dead links is
 * worse than a footer that waits.
 */
const HELP = [
  "Trocas e devoluções",
  "Prazos de entrega",
  "Guia de medidas",
  "Falar com atendimento",
];

const INSTITUTIONAL = [
  "Sobre a AVESSO",
  "Onde produzimos",
  "Política de privacidade",
  "Termos de uso",
];

const CONTACT = [
  "atendimento@avesso.com.br",
  "Seg a sex 9h às 18h",
  "São Paulo SP",
];

const PAYMENT_METHODS = ["Visa", "Mastercard", "Elo", "Pix", "Boleto"];

const LEGAL =
  "AVESSO Confecções LTDA · CNPJ 42.318.907/0001-55 · Rua Aurora 148, São Paulo SP";

export async function SiteFooter() {
  const categories = await listCategories();

  return (
    <footer className="mt-auto flex flex-col gap-12 px-24 pt-16 pb-12">
      <div className="grid grid-cols-4 gap-6">
        <Column title="Loja">
          {categories.map((category) => (
            <TextLink
              key={category.id}
              href={`/catalogo?categoria=${category.slug}`}
              className="text-small"
            >
              {category.name}
            </TextLink>
          ))}
        </Column>

        <Column title="Ajuda">
          {HELP.map((item) => (
            <span key={item} className="text-small">
              {item}
            </span>
          ))}
        </Column>

        <Column title="Institucional">
          {INSTITUTIONAL.map((item) => (
            <span key={item} className="text-small">
              {item}
            </span>
          ))}
        </Column>

        <Column title="Contato">
          {CONTACT.map((item) => (
            <span key={item} className="text-small">
              {item}
            </span>
          ))}
        </Column>
      </div>

      <div className="type-meta flex items-center justify-between border-t border-hairline pt-6 text-muted">
        <span>{LEGAL}</span>
        <span className="flex gap-4">
          {PAYMENT_METHODS.map((method) => (
            <span key={method}>{method}</span>
          ))}
        </span>
      </div>
    </footer>
  );
}

function Column({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="type-meta text-muted">{title}</h2>
      {children}
    </div>
  );
}
