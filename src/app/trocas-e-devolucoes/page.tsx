import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Trocas e Devoluções",
  description:
    "Direito de arrependimento em 7 dias, garantia legal e procedimentos de troca conforme Decreto Federal 7.962/2013.",
};

export default function TrocasDevolucoesPage() {
  const { name, legal } = siteConfig;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col px-6 py-12 md:px-12 md:py-16">
        <header className="border-b border-hairline pb-8">
          <p className="type-meta text-muted">Atendimento & Conformidade Legal</p>
          <h1 className="mt-2 text-h2 md:text-h1">
            Trocas, Devoluções e Arrependimento
          </h1>
          <p className="mt-4 text-body text-muted">
            Diretrizes em conformidade estrita com o Artigo 49 do Código de Defesa
            do Consumidor (Lei 8.078/1990) e com o Decreto Federal do Comércio
            Eletrônico nº 7.962/2013.
          </p>
        </header>

        <div className="mt-10 flex flex-col gap-10">
          <section className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">1. Direito de Arrependimento (7 dias corridos)</h2>
            <p className="text-body text-pretty">
              Conforme previsto no Art. 49 do CDC e Art. 5º do Decreto 7.962/2013, o
              cliente tem o direito de desistir da compra efetuada no ambiente
              eletrônico no prazo de até <strong>7 (sete) dias corridos</strong> a
              contar do recebimento do produto no endereço indicado.
            </p>
            <p className="text-body text-pretty">
              A manifestação do arrependimento acarreta a rescisão contratual sem
              qualquer ônus para o consumidor. O reembolso é integral, incluindo
              o valor pago pelas peças e a tarifa de frete cobrada no pedido.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">2. Trocas por Tamanho ou Modelo</h2>
            <p className="text-body text-pretty">
              Deseja trocar o tamanho ou cor de uma peça? Aceitamos solicitações de
              troca em até <strong>30 (trinta) dias corridos</strong> após a entrega,
              desde que a peça esteja intacta, sem sinais de lavagem ou uso, com as
              etiquetas originais afixadas.
            </p>
            <p className="text-body text-pretty">
              A primeira troca por pedido tem o frete de devolução e reenvio coberto
              pela {name}.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">3. Vício ou Defeito de Fabricação (Garantia Legal)</h2>
            <p className="text-body text-pretty">
              Nos termos do Art. 26, inciso II, do Código de Defesa do Consumidor,
              garantimos o prazo de <strong>90 (noventa) dias</strong> para reclamação
              de eventuais vícios aparentes ou de fácil constatação em nossos
              produtos.
            </p>
            <p className="text-body text-pretty">
              Caso seja constatado defeito de fabricação na análise técnica, o
              cliente poderá optar pela substituição do item, restituição imediata
              do valor ou abatimento proporcional.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">4. Procedimento de Logística Reversa</h2>
            <p className="text-body text-pretty">
              Para efetuar a devolução, você receberá por e-mail uma Autorização de
              Postagem pré-paga para envio nos Correios ou transportadora parceira.
              Basta embalar a peça devidamente protegida, anexar a Nota Fiscal ou
              declaração de conteúdo e despachar na agência mais próxima.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">5. Prazos e Modalidades de Estorno</h2>
            <ul className="list-disc pl-6 text-body space-y-2">
              <li>
                <strong>PIX:</strong> O reembolso é efetuado via transferência PIX na
                chave informada pelo titular em até 2 (dois) dias úteis após a
                conferência do produto em nosso centro de distribuição.
              </li>
              <li>
                <strong>Cartão de Crédito:</strong> O cancelamento/estorno é solicitado
                à adquirente em até 2 (dois) dias úteis. A devolução do limite ou
                crédito na fatura é efetuada pela emissora do cartão e costuma
                ocorrer em 1 a 2 faturas subsequentes.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3 border-t border-hairline pt-8">
            <h2 className="text-h3 font-semibold">6. Como Solicitar</h2>
            <p className="text-body text-pretty">
              Para iniciar o processo de troca ou devolução, entre em contato com nosso
              canal oficial de atendimento informando o número do pedido e o motivo:
            </p>
            <div className="mt-2 flex flex-col gap-1 text-body">
              <p>
                <strong>E-mail de Suporte:</strong>{" "}
                <a
                  href={`mailto:${legal.contact.email}?subject=Solicita%C3%A7%C3%A3o%20de%20Troca%20ou%20Devolu%C3%A7%C3%A3o`}
                  className="text-rust underline underline-offset-4"
                >
                  {legal.contact.email}
                </a>
              </p>
              <p>
                <strong>WhatsApp / Telefone:</strong> {legal.contact.phone || legal.contact.whatsapp}
              </p>
              <p>
                <strong>Horário de Atendimento:</strong> {legal.contact.hours}
              </p>
            </div>
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
