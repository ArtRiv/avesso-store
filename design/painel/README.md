# Canvas do painel administrativo — material bruto

Extraído do Artifact publicado
(`5b8b0c78-b90e-4e27-b779-be45fac3ac95`, "Painel Commerce Core") em 28/08/2026.
`Relatorios.dc.html` veio depois, em 29/08/2026, do projeto do Claude Design
"E-commerce flow prototypes" (`f24eebd7-789b-4375-97df-d3bac0883e27`).

| arquivo | artboard |
| --- | --- |
| `Products.dc.html` | Produtos · lista |
| `Main.dc.html` | Produto · editor e tamanhos |
| `VariantRemoval.dc.html` | Remover tamanho · três estados |
| `Categories.dc.html` | Categorias |
| `Orders.dc.html` | Pedidos · lista |
| `OrderDetail.dc.html` | Pedido · detalhe e transições |
| `Relatorios.dc.html` | Relatórios · estado zero, série com dados, e as duas listas |
| `canvas.json` | Posição dos artboards e as quatro anotações |

Os seis primeiros são HTML e CSS puros, sem `sc-for` nem `sc-if`, e abrem
direto no browser. **`Relatorios.dc.html` não** — ele veio do canvas da loja e
usa o runtime do Claude Design, então precisa do `support.js` que está em
[`../support.js`](../support.js), e mesmo assim espera `window.React`. Para
conferir um valor sem renderizar, leia o `renderVals()` no fim do arquivo: é
onde estão a série, os rótulos dos eixos e as duas tabelas de exemplo.

## Por que estão versionados

Porque o Artifact é a fonte e um arquivo temporário não é. Sem isto, conferir
um detalhe do desenho exige reextrair 2,5 MB de HTML do Artifact publicado, e
a próxima sessão não tem como saber que foi isso o que se leu.

## As quatro anotações do canvas

Elas não estão nos artboards, e valem mais que qualquer um deles:

- **Tamanhos** — "Arrastar reordena (salva a lista inteira), o lápis renomeia,
  a lixeira remove. Vendido = cadeado: renomear é a saída."
- **Remoção** — "A confirmação de duas metades numa gesto só: o número vive
  dentro da frase que se aceita. Se ele muda, a caixa desmarca e nada é
  apagado."
- **Escopo** — era "Só catálogo e pedidos. Clientes, relatórios e concessão de
  permissão não têm rota ainda — desenhar essas telas agora seria o desenho
  ditando o contrato." As quatro rotas de `reports.read` entraram, e o artboard
  de relatórios veio junto; a regra continua valendo para clientes e permissão.
- **Relatórios** — "Quatro leituras, quatro endpoints. Nada de desconto, cupom,
  cliente, conversão ou visita: a API não conta nada disso. A faixa de sacolas
  ignora o período de propósito — carrinho não tem passado."

## Onde o código diverge

Quatro coisas o canvas assume que a API não entrega — o cadeado num tamanho
vendido, a contagem de sacolas antes de tentar remover, o e-mail de quem está
logado, e **a linha de quatro totais sobre o gráfico de receita**, que o
próprio `renderVals()` do artboard preenche somando os buckets em JavaScript.

Estão registradas no [`README.md`](../../README.md) da raiz, em
"Divergências conhecidas", com o motivo de cada uma. **Uma reimportação do
canvas não deve desfazê-las sem ler aquilo primeiro.**
