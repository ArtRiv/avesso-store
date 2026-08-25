# Canvas do Claude Design — fonte do contrato visual

Importado do projeto **E-commerce flow prototypes**
(`f24eebd7-789b-4375-97df-d3bac0883e27`) em 25/08/2026, via o MCP do Claude
Design.

| arquivo | o que é |
| --- | --- |
| `AVESSO Storefront.dc.html` | O canvas com os 10 artboards. Template + o bloco `renderVals()` no fim do arquivo, que carrega o catálogo de demonstração, os tons, os tamanhos, a sacola e os totais. |
| `support.js` | O runtime do Claude Design que interpreta `<x-dc>`, `<sc-for>` e `<sc-if>`. Gerado, não editar. |

## Hierarquia

Isto é o **material bruto**, não o contrato de trabalho. Quem constrói lê
[`../docs/design-system.md`](../docs/design-system.md) — a extração revisada,
que carrega tokens, CSS de componente, inventário de telas e copy deck.

O canvas fica aqui para duas coisas: conferir um detalhe que a extração não
carregou, e detectar divergência quando o design for atualizado lá em cima.

## Não abre direto no browser

`support.js` espera `window.React` e `window.ReactDOM`, que o `.dc.html` não
carrega. Para ver renderizado, use o canvas publicado; para conferir um valor,
leia o `renderVals()` no fim do `.dc.html` — é onde estão todos os dados.

## Reimportar

O canvas publicado ganha destes arquivos. Se ele mudar, reimporte pelo MCP
(`DesignSync.get_file`) em vez de editar aqui, e então atualize
`docs/design-system.md` a partir do arquivo novo.
