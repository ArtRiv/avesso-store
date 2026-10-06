import { TextLink } from "@/components/text-link";
import { formatLegalFooter, siteConfig } from "@/config/site";
import { listCategories } from "@/lib/catalog";

const PAYMENT_METHODS = ["Visa", "Mastercard", "Elo", "Pix", "Boleto"];

export async function SiteFooter() {
  const categories = await listCategories();
  const { name, legal } = siteConfig;

  return (
    <footer className="mt-auto flex flex-col gap-12 px-6 md:px-12 lg:px-24 pt-16 pb-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
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
          <TextLink href="/trocas-e-devolucoes" className="text-small">
            Trocas e devoluções
          </TextLink>
          <TextLink href="/termos#entrega" className="text-small">
            Prazos de entrega
          </TextLink>
          <span className="text-small">Guia de medidas</span>
          <TextLink
            href={`mailto:${legal.contact.email}?subject=Atendimento%20ao%20Cliente`}
            className="text-small"
          >
            Falar com atendimento
          </TextLink>
        </Column>

        <Column title="Institucional">
          <span className="text-small">Sobre a {name}</span>
          <span className="text-small">Onde produzimos</span>
          <TextLink href="/privacidade" className="text-small">
            Política de privacidade
          </TextLink>
          <TextLink href="/termos" className="text-small">
            Termos de uso
          </TextLink>
        </Column>

        <Column title="Contato">
          <TextLink href={`mailto:${legal.contact.email}`} className="text-small">
            {legal.contact.email}
          </TextLink>
          <span className="text-small">{legal.contact.hours}</span>
          <span className="text-small">
            {legal.address.city} {legal.address.state}
          </span>
        </Column>
      </div>

      <div className="type-meta flex flex-col gap-6 border-t border-hairline pt-6 text-muted md:flex-row md:items-center md:justify-between">
        <span>{formatLegalFooter(legal)}</span>
        <span className="flex flex-wrap gap-4">
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
