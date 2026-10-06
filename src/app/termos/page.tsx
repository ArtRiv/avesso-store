import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Termos de Uso e Condições de Compra",
  description:
    "Termos de uso, condições de compra, meios de pagamento e prazos de entrega em conformidade com o Decreto Federal 7.962/2013.",
};

export default function TermosPage() {
  const { name, legal } = siteConfig;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col px-6 py-12 md:px-12 md:py-16">
        <header className="border-b border-hairline pb-8">
          <p className="type-meta text-muted">Contrato Eletrônico & Legislação</p>
          <h1 className="mt-2 text-h2 md:text-h1">Termos de Uso e Condições de Compra</h1>
          <p className="mt-4 text-body text-muted">
            Este instrumento estabelece os termos e condições contratuais aplicáveis às
            operações realizadas no site {name}, em conformidade com o Código de Defesa
            do Consumidor (Lei nº 8.078/1990) e o Decreto Federal nº 7.962/2013.
          </p>
        </header>

        <div className="mt-10 flex flex-col gap-10">
          <section className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">1. Identificação do Fornecedor</h2>
            <p className="text-body text-pretty">
              A plataforma é operada por:
            </p>
            <div className="mt-2 flex flex-col gap-1 text-body bg-paper border border-hairline p-4">
              <p><strong>Razão Social:</strong> {legal.companyName}</p>
              <p><strong>CNPJ:</strong> {legal.cnpj}</p>
              <p><strong>Endereço da Sede:</strong> {legal.address.street}, {legal.address.number}{legal.address.complement ? ` - ${legal.address.complement}` : ''}, {legal.address.neighborhood}, {legal.address.city} - {legal.address.state}, CEP {legal.address.postalCode}</p>
              <p><strong>Canal de Atendimento:</strong> {legal.contact.email} · {legal.contact.hours}</p>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">2. Formação do Pedido e Confirmação Imediata</h2>
            <p className="text-body text-pretty">
              Antes de finalizar a compra, o cliente visualiza o sumário do contrato contendo
              a descrição exata dos produtos selecionados, quantidades, preço unitário, valor
              individualizado do frete e o prazo estimado de entrega.
            </p>
            <p className="text-body text-pretty">
              Imediatamente após a conclusão do pedido, a {name} emite confirmação na tela
              com o número de protocolo do pedido e envia confirmação formal para o endereço de
              e-mail cadastrado.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">3. Preços e Formas de Pagamento</h2>
            <p className="text-body text-pretty">
              Todos os preços são expressos em moeda nacional (Reais - R$) e discriminam
              quaisquer encargos ou custos adicionais incidentes.
            </p>
            <p className="text-body text-pretty">
              Disponibilizamos pagamento à vista via <strong>PIX</strong> (com processamento
              imediato) e parcelado via <strong>Cartão de Crédito</strong> nacional em até 12x,
              através de intermediadores de pagamento homologados com certificação de segurança PCI-DSS.
            </p>
          </section>

          <section id="entrega" className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">4. Prazos e Condições de Entrega</h2>
            <p className="text-body text-pretty">
              As entregas são realizadas em todo o território nacional através de transportadoras
              parceiras e Correios. Os prazos de entrega passam a contar a partir da confirmação do
              pagamento e variam conforme o CEP de destino indicado no checkout.
            </p>
            <p className="text-body text-pretty">
              O cliente recebe o código de rastreamento do envio para acompanhamento em tempo real
              assim que o pacote for despachado.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">5. Direito de Arrependimento e Devoluções</h2>
            <p className="text-body text-pretty">
              O consumidor tem o direito garantido de desistir do contrato eletrônico em até
              7 (sete) dias corridos do recebimento, sem ônus, conforme detalhado em nossa{" "}
              <Link href="/trocas-e-devolucoes" className="text-rust underline underline-offset-4">
                Política de Trocas e Devoluções
              </Link>.
            </p>
          </section>

          <section className="flex flex-col gap-3 border-t border-hairline pt-8">
            <h2 className="text-h3 font-semibold">6. Legislação Aplicável e Foro</h2>
            <p className="text-body text-pretty">
              Os presentes Termos de Uso são regidos pelas leis da República Federativa do Brasil.
              Para dirimir quaisquer controvérsias decorrentes deste contrato, fica eleito o foro
              do domicílio do consumidor, nos termos do Código de Defesa do Consumidor.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-hairline pt-8">
          <Link href="/" className="type-meta text-muted hover:text-ink">
            ← Voltar para a página inicial
          </Link>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
