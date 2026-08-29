# Canvas do painel administrativo — material bruto

Extraído do Artifact publicado
(`5b8b0c78-b90e-4e27-b779-be45fac3ac95`, "Painel Commerce Core") em 28/08/2026.

| arquivo | artboard |
| --- | --- |
| `Products.dc.html` | Produtos · lista |
| `Main.dc.html` | Produto · editor e tamanhos |
| `VariantRemoval.dc.html` | Remover tamanho · três estados |
| `Categories.dc.html` | Categorias |
| `Orders.dc.html` | Pedidos · lista |
| `OrderDetail.dc.html` | Pedido · detalhe e transições |
| `canvas.json` | Posição dos artboards e as três anotações |

Não há `support.js` aqui: estes artboards são HTML e CSS puros, sem `sc-for`
nem `sc-if`, então abrem direto no browser — ao contrário do canvas da loja.

## Por que estão versionados

Porque o Artifact é a fonte e um arquivo temporário não é. Sem isto, conferir
um detalhe do desenho exige reextrair 2,5 MB de HTML do Artifact publicado, e
a próxima sessão não tem como saber que foi isso o que se leu.

## As três anotações do canvas

Elas não estão nos artboards, e valem mais que qualquer um deles:

- **Tamanhos** — "Arrastar reordena (salva a lista inteira), o lápis renomeia,
  a lixeira remove. Vendido = cadeado: renomear é a saída."
- **Remoção** — "A confirmação de duas metades numa gesto só: o número vive
  dentro da frase que se aceita. Se ele muda, a caixa desmarca e nada é
  apagado."
- **Escopo** — "Só catálogo e pedidos. Clientes, relatórios e concessão de
  permissão não têm rota ainda — desenhar essas telas agora seria o desenho
  ditando o contrato."

## Onde o código diverge

Três coisas o canvas assume que a API não entrega — o cadeado num tamanho
vendido, a contagem de sacolas antes de tentar remover, e o e-mail de quem
está logado. Estão registradas no [`README.md`](../../README.md) da raiz, em
"Divergências conhecidas", com o motivo de cada uma. **Uma reimportação do
canvas não deve desfazê-las sem ler aquilo primeiro.**
