# AVESSO — contrato visual (v1)

Extraído do canvas do Claude Design (`AVESSO Storefront.dc.html`, projeto
"E-commerce flow prototypes"). Este arquivo é a **fonte de verdade do
design**: se o código divergir daqui, o código está errado.

O canvas tem 10 artboards. Este documento carrega os tokens, os
componentes com CSS exato, o inventário de telas e o copy deck completo —
para que ninguém precise abrir o canvas para construir a loja.

---

## 1. Tokens

### Cor — light only. A loja não tem dark mode.

| token | hex | uso |
| --- | --- | --- |
| `ink` | `#0A0A0A` | texto, botão primário |
| `paper` | `#FFFFFF` | cartões, superfícies |
| `warm` | `#F5F3EF` | fundo de página |
| `hairline` | `#E4E0D8` | toda borda, todo fio |
| `muted` | `#6B6560` | meta, placeholder |
| `rust` | `#B0431E` | único acento, CTA de recuperação, badge "últimas unidades" |
| `moss` | `#1F6F52` | em estoque, pago |
| `clay` | `#8C2F2F` | esgotado, erro |

Tons de imagem (placeholders de foto, ver §4):
`bone #EDE9E1` · `stone #D8D3C9` · `ink-wash #2A2724` · `clay-wash #C9BCB0` · `sage-wash #C3C9BC`

Texto sobre placeholder: `#8C8781` em tom claro, `rgba(255,255,255,0.55)` em tom escuro.

**Rust é racionado.** Ele aparece no CTA de recuperação do conflito de
estoque, na barra de espera do pagamento, no badge de últimas unidades e
no hover de link. Em nenhum outro lugar.

### Tipografia — Google Fonts

- **Archivo** 400/500/600/700 — tudo
- **JetBrains Mono** 400/500 — preços, tamanhos, número do pedido, CEP, rótulos uppercase

| papel | CSS |
| --- | --- |
| display | `600 72px/0.95 Archivo`, `letter-spacing:-.03em` |
| h1 | `600 48px/1.05 Archivo`, `letter-spacing:-.02em` |
| h2 | `600 32px/1.15 Archivo`, `letter-spacing:-.015em` |
| h3 | `500 20px/1.3 Archivo`, `letter-spacing:-.01em` |
| body | `400 16px/1.55 Archivo` |
| small | `400 14px/1.5 Archivo` |
| meta | `500 12px/1.4 JetBrains Mono`, `letter-spacing:.08em`, `text-transform:uppercase` |
| price | `500 16px/1.2 JetBrains Mono`, `font-variant-numeric:tabular-nums`, `letter-spacing:-.01em` |

Wordmark: `AVESSO` em `600 20px Archivo` com `letter-spacing:.22em` no
header; `600 48px` com `.18em` no style tile.

### Espaço, grid, forma

- Escala de 4px: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160
- Artboards de 1440px. Padding lateral de página: **96px**. Gutter de grid: **24px**
- `border-radius: 2px` em botões e campos. **0 em todo o resto.**
- **Nenhuma `box-shadow` em lugar nenhum.** Elevação é fio de 1px em `hairline` + espaço.
- Grid de produtos: 4 colunas no catálogo, 3 na home, 4 no "você também pode gostar"

---

## 2. Componentes (CSS exato do canvas)

**Botão primário**
```css
height:48px; padding:0 24px; background:#0A0A0A; color:#FFFFFF;
border:none; border-radius:2px; cursor:pointer;
font:500 12px/1 'JetBrains Mono',monospace;
letter-spacing:.08em; text-transform:uppercase;
```

**Botão secundário** — igual, mas `background:transparent; color:#0A0A0A; border:1px solid #0A0A0A`

**Botão desabilitado** — `background:#E4E0D8; color:#6B6560; border:none`

**Botão de recuperação (só no conflito de estoque)** — igual ao primário, com `background:#B0431E`

**Campo**
```css
height:48px; border:1px solid #E4E0D8; border-radius:2px; background:#FFFFFF;
padding:0 16px; font:400 16px/1 Archivo,sans-serif;
```
- preenchido → `border-color:#0A0A0A`
- erro → `border-color:#8C2F2F` + mensagem em `400 14px/1.5 Archivo` na cor `clay`
- CEP e campos numéricos usam `font-family:'JetBrains Mono'`
- label acima, em estilo `meta`, cor `muted` (ou `clay` no estado de erro)

**Badge**
```css
font:500 12px/1.4 'JetBrains Mono',monospace; letter-spacing:.08em;
text-transform:uppercase; padding:4px 8px; background:transparent;
border:1px solid <cor>; color:<cor>;
```
`Em estoque` → moss · `Últimas N unidades` → rust · `Esgotado` → clay

**Célula de tamanho** — `48×48px`, `border:1px solid`, `font:500 14px/1 JetBrains Mono`, `letter-spacing:.04em`
- selecionada → `border-color:#0A0A0A; background:#FFFFFF`
- disponível → `border-color:#E4E0D8`
- indisponível → `border-color:#E4E0D8; color:#6B6560; text-decoration:line-through` (**riscada, nunca escondida**)

**Tile de produto**
```
imagem 4:5, border:1px solid #E4E0D8, background:<tom>
  └ nome em 400 11px/1.2 mono, letter-spacing:.06em, uppercase,
    posicionado absolute left:12px bottom:12px
nome        400 16px/1.55 Archivo
preço + badge  flex, gap:12px, align-items:center
```
Produto esgotado no grid: `opacity:.45`, `filter:grayscale(1)`, preço em `muted`.

**Header** — `height:80px`, `border-bottom:1px solid #E4E0D8`, `padding:0 96px`,
três blocos em `space-between`: wordmark · categorias em meta · `Buscar`/`Conta`/`Sacola (N)` em meta.
Ícones: SVG inline `20×20`, `fill:none`, `stroke:#0A0A0A`, `stroke-width:1.5`. Só existem quatro: busca, conta, sacola, seta.

**Barra de espera** (confirmação de pagamento) — trilho de `2px` em `hairline`,
preenchimento de `30%` em `rust`, `@keyframes` de `translateX(-100%)` a `translateX(340%)`,
`1.8s linear infinite`. **Nunca um spinner.**

---

## 3. Inventário de telas

| # | artboard | rota no front |
| --- | --- | --- |
| 01 | Style tile · 1440×1600 | — (é o contrato) |
| 02 | Home · 1440×3160 | `/` |
| 03 | Catálogo · 1440×2200 | `/catalogo` |
| 04 | Produto (PDP) · 1440×3560 | `/produto/[slug]` |
| 05 | Produto · parede de login · 1440×900 | estado de `/produto/[slug]` |
| 06 | Sacola · 1440×1200 | `/sacola` |
| 07 | Checkout · 1440×1700 | `/checkout` |
| 08 | Pedido recebido · webhook assíncrono · 1440×1100 | `/pedido/[id]` — **duas variantes** |
| 09 | Sacola vazia · 1440×1120 | estado de `/sacola` |
| 10 | Conflito de estoque (409) · 1440×1200 | estado de `/checkout` |

### Estrutura por tela

**02 — Home**: header · hero full-bleed 16:9 com display "Doze peças. Feitas
para durar anos." e CTA `Ver o catálogo` · "Em destaque" 3-up com link
`Ver as 12 peças` · faixa de 4 categorias com contagem · banda editorial
"O tecido" com macro de malha e pull-quote em 48px · linha de newsletter
(um campo + `Assinar`) · footer de 4 colunas + bandeiras + linha legal.

**03 — Catálogo**: título `Catálogo` + contagem `12 peças` · busca por nome ·
ordenação (Mais recentes / Menor preço / Maior preço / Nome A–Z) ·
rail esquerdo com categorias e faixas de preço como listas separadas por
fio (sem accordion, sem chip, sem pill) · grid 4-up · paginação
`Anterior · 1 · Próxima`.

**04 — PDP**: breadcrumb `Catálogo / Camisetas / <nome>` · coluna esquerda
com 3 imagens empilhadas (não é carrossel) · coluna direita sticky:
h1, preço, descrição, `Tamanho` + `Guia de medidas`, linha de tamanhos,
nota de indisponibilidade, badge de estoque, CTA full-width, nota de frete,
tabela de specs em grid `1fr 2fr` separada por fios · `Você também pode gostar` 4-up.

**05 — Parede de login**: o painel substitui o CTA na coluna direita.
Título `Entre para montar sua sacola`, nota "A peça e o tamanho P ficam
guardados. Você continua nesta página.", campos e-mail/senha, `Entrar`
primário, `Criar conta` secundário, `Esqueci minha senha` em link.
A página **não navega**.

**06 — Sacola**: linhas separadas por fio (imagem 4:5 pequena, nome,
`Tamanho X · Remover`, preço unitário, stepper `− N +`, total à direita) ·
resumo sticky com Subtotal / Frete "calculado no checkout" / Total ·
nota em muted: "O estoque não é reservado. A peça sai da sacola se acabar
antes do pagamento."

**07 — Checkout**: três seções numeradas `01 Entrega`, `02 Pagamento`,
`03 Revisão`, todas visíveis ao mesmo tempo, separadas por fios — **sem
wizard**. Entrega: CEP + `Calcular frete`, depois endereço preenchido e as
opções de frete como radios de fio. Pagamento: bloco da Stripe com nota
"Os dados do cartão são digitados no campo da Stripe. A AVESSO não recebe
nem armazena o número." Revisão: itens compactos + totais. CTA:
`Finalizar pedido — R$ 522,30`.

**08 — Pedido recebido**: as duas variantes ficam lado a lado no canvas.
*Aguardando*: `Pedido #A3F2-91C4` em meta, h1 `Recebemos seu pedido`,
`Confirmando o pagamento` + barra rust, nota "A confirmação vem do
processador de pagamento e costuma levar alguns segundos. Você pode fechar
esta página: enviamos um e-mail quando o pagamento for aprovado.", tabela
Status/Itens/Frete/Total, `Ver meus pedidos`.
*Confirmado*: badge `Pago` em moss, `Entrega estimada entre 26 e 28 de
agosto`, nota sobre rastreio, mesma tabela com Status `Pago`.

**10 — Conflito de estoque**: item removido marcado em clay com nome e
preço riscados e `filter:grayscale(1)` · banner no topo do resumo com
borda `clay`, rótulo meta `Sacola atualizada` e o texto "A Camiseta
Listrada Marinho esgotou enquanto você finalizava. Removemos da sacola —
o total foi atualizado." · total antigo riscado em muted ao lado do novo ·
CTA rust `Finalizar com 2 peças — R$ 522,30` · nota `Nada foi cobrado ainda.`
**Sem modal. Sem caixa vermelha.**

---

## 4. Imagens

O canvas não usa foto nenhuma: cada imagem é um bloco de cor sólida com o
nome da peça em mono, 11px, uppercase, no canto inferior esquerdo. Isso é
placeholder — quando houver foto real ela entra no mesmo box, mesma
proporção (4:5 em produto, 16:9 no hero), e o rótulo sai.

O backend guarda `imageUrls` como URLs simples: não há upload. Enquanto
não houver foto, mantenha o bloco de cor — é melhor que um ícone de
imagem quebrada, e mantém o layout honesto.

---

## 5. Catálogo de demonstração

| peça | preço | tom | categoria | estoque |
| --- | --- | --- | --- | --- |
| Camiseta Pesada Preta | R$ 149,90 | ink-wash | Camisetas | — |
| Camiseta Pesada Off-White | R$ 149,90 | bone | Camisetas | — |
| Camiseta Pesada Areia | R$ 149,90 | clay-wash | Camisetas | últimas 2 |
| Camiseta Manga Longa Off-White | R$ 189,90 | bone | Camisetas | — |
| Camiseta Listrada Marinho | R$ 169,90 | stone | Camisetas | esgotado |
| Moletom Careca Cinza Mescla | R$ 329,90 | stone | Moletons | — |
| Moletom Careca Preto | R$ 329,90 | ink-wash | Moletons | — |
| Calça Cargo Bege | R$ 289,90 | clay-wash | Calças | — |
| Calça Alfaiataria Preta | R$ 349,90 | ink-wash | Calças | — |
| Jaqueta Corta-Vento Preta | R$ 399,90 | ink-wash | Calças | últimas 3 |
| Boné Aba Curva Preto | R$ 119,90 | sage-wash | Acessórios | — |
| Meia Canelada — kit com 3 | R$ 79,90 | bone | Acessórios | — |

Categorias: `Camisetas` (5) · `Moletons` (2) · `Calças` (3) · `Acessórios` (2)

Frete: `SEDEX · 2 dias úteis · Correios · R$ 42,50` · `PAC · 7 dias úteis · Correios · R$ 24,90`

Specs do PDP: Composição `100% algodão penteado, 240 g/m²` · Modelagem
`Reta, unissex, ombro caído` · Peso `310 g no tamanho M` · Cuidados
`Lavar à máquina em água fria, secar à sombra, não usar alvejante`

Footer: **Loja** (as 4 categorias) · **Ajuda** (Trocas e devoluções,
Prazos de entrega, Guia de medidas, Falar com atendimento) ·
**Institucional** (Sobre a AVESSO, Onde produzimos, Política de
privacidade, Termos de uso) · **Contato** (atendimento@avesso.com.br,
Seg a sex 9h às 18h, São Paulo SP).
Linha legal: `AVESSO Confecções LTDA · CNPJ 42.318.907/0001-55 · Rua Aurora 148, São Paulo SP`
Bandeiras: Visa · Mastercard · Elo · Pix · Boleto

---

## 6. Regras de copy

- pt-BR. Sentence case no corpo, UPPERCASE só nos rótulos mono.
- Declarativo e sem pressa. Sem ponto de exclamação, sem "Oferta!", sem teatro de urgência.
- O carrinho chama-se **sacola**.
- Botões são verbos: `Adicionar à sacola`, `Finalizar pedido`, `Calcular frete`.
- Erro diz o que aconteceu e o que foi feito, nessa ordem.
- Nada de lorem ipsum.

## 7. Proibido

- Card arredondado, sombra, gradiente em superfície de UI, glassmorphism
- Um segundo acento além do rust
- Cupom, wishlist, avaliação, nota, checkout de convidado, seletor de moeda — **o backend não tem nenhum deles**
- Biblioteca de ícones
- Texto de corpo centralizado (exceto artboards 08 e 09)
- Spinner
