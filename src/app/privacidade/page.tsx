import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Política de Privacidade e Proteção de Dados",
  description:
    "Tratamento de dados pessoais, segurança da informação e diretrizes da LGPD (Lei 13.709/2018) na loja virtual.",
};

export default function PrivacidadePage() {
  const { name, legal } = siteConfig;

  return (
    <>
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col px-6 py-12 md:px-12 md:py-16">
        <header className="border-b border-hairline pb-8">
          <p className="type-meta text-muted">Privacidade & Proteção de Dados</p>
          <h1 className="mt-2 text-h2 md:text-h1">Política de Privacidade</h1>
          <p className="mt-4 text-body text-muted">
            Transparência e segurança no tratamento dos seus dados pessoais, em estrita
            conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018)
            e com o Marco Civil da Internet (Lei nº 12.965/2014).
          </p>
        </header>

        <div className="mt-10 flex flex-col gap-10">
          <section className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">1. Controlador dos Dados</h2>
            <p className="text-body text-pretty">
              O controlador responsável pelo tratamento dos seus dados pessoais é a{" "}
              <strong>{legal.companyName}</strong>, inscrita no CNPJ sob o nº{" "}
              <strong>{legal.cnpj}</strong>, com sede em {legal.address.street},{" "}
              {legal.address.number}, {legal.address.city} - {legal.address.state}.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">2. Dados Pessoais Coletados e Finalidade</h2>
            <p className="text-body text-pretty">
              Coletamos exclusivamente os dados necessários para viabilizar sua experiência de compra:
            </p>
            <ul className="list-disc pl-6 text-body space-y-2">
              <li>
                <strong>Cadastro e Autenticação:</strong> Nome completo, e-mail e credenciais de acesso
                para identificação segura e criação da conta.
              </li>
              <li>
                <strong>Faturamento e Entrega:</strong> CPF, endereço completo e telefone para emissão
                obrigatória da Nota Fiscal Eletrônica (NF-e) e despacho logístico da mercadoria.
              </li>
              <li>
                <strong>Comunicação Transacional:</strong> Envio de confirmação de pedido, código de rastreamento
                e atualizações de entrega.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">3. Segurança dos Dados de Pagamento</h2>
            <p className="text-body text-pretty">
              A {name} <strong>não armazena números de cartão de crédito nem códigos de segurança (CVV)</strong> em seus servidores.
              Todas as transações de pagamento são processadas diretamente em ambiente seguro com
              criptografia de ponta a ponta por intermediadores certificados no nível mais rigoroso do
              padrão PCI-DSS (Payment Card Industry Data Security Standard).
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">4. Cookies e Tecnologias de Sessão</h2>
            <p className="text-body text-pretty">
              Utilizamos cookies estritamente necessários (com atributo de segurança <code>httpOnly</code>)
              com a única finalidade de preservar a sessão autenticada do usuário e os itens da sacola
              de compras, prevenindo ataques do tipo Cross-Site Scripting (XSS). Não comercializamos
              dados de navegação com terceiros.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-h3 font-semibold">5. Direitos do Titular de Dados</h2>
            <p className="text-body text-pretty">
              Em cumprimento ao Artigo 18 da LGPD, você pode a qualquer momento:
            </p>
            <ul className="list-disc pl-6 text-body space-y-1">
              <li>Confirmar a existência do tratamento e acessar seus dados cadastrais;</li>
              <li>Solicitar a correção de dados incompletos ou desatualizados;</li>
              <li>Requerer a portabilidade ou a eliminação de dados pessoais não obrigatórios por lei fiscal.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3 border-t border-hairline pt-8">
            <h2 className="text-h3 font-semibold">6. Contato do Encarregado de Proteção de Dados (DPO)</h2>
            <p className="text-body text-pretty">
              Para exercer seus direitos ou esclarecer qualquer dúvida sobre nossa política de privacidade,
              entre em contato com nosso canal de privacidade:
            </p>
            <p className="text-body">
              <strong>E-mail de Contato:</strong>{" "}
              <a
                href={`mailto:${legal.contact.email}?subject=LGPD%20-%20Privacidade%20de%20Dados`}
                className="text-rust underline underline-offset-4"
              >
                {legal.contact.email}
              </a>
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
