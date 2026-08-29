# Testes do painel

Integração de ponta a ponta, dirigidos **pelo BFF deste app** — cada checagem
faz a mesma requisição que o navegador faria, com cookie de verdade e nenhum
token à vista. É por isso que eles pegam coisas que teste de unidade não pega:
a fronteira de autorização, o formato de um `409`, e o que realmente chega ao
HTML.

```
pnpm test           # todas as suítes
pnpm test orders    # só a que começa com "orders"
```

## Pré-requisitos, e por que são estes

**Não rodam contra a instância implantada.** Elas criam produtos, apagam
tamanhos e movem pedidos — trabalho de escrita destrutiva que não se faz na
loja de verdade.

1. **commerce-core rodando local na :3000, apontado para um schema
   descartável.** Nunca para `public`: o `public` do banco de desenvolvimento
   é o que serve a loja publicada, com as doze peças da AVESSO. O
   `README.md` da raiz explica a armadilha inteira.

   ```bash
   cd ../commerce-core
   pnpm e2e:setup                       # reconstrói o schema `e2e`
   DATABASE_URL="$E2E_DATABASE_URL" pnpm start
   ```

2. **`API_URL=http://localhost:3000` no `.env.local` deste app**, e
   `pnpm dev` na :5173.

3. **Duas contas no schema de teste**: `operador@avesso.test` promovido a
   `admin`, e `cliente@avesso.test` como cliente comum, ambas com e-mail
   verificado e a senha `correct horse battery staple`. Promover é um `UPDATE`
   no banco — não existe rota para isso, aqui nem na API, e é de propósito.

## O que cada arquivo é

| arquivo | o que cobre |
| --- | --- |
| `panel.mjs` | fronteira de autorização, listagem, renomear, reordenar, estoque, adicionar, salvar, arquivar |
| `removal.mjs` | os três estados da remoção de tamanho, **incluindo a corrida** |
| `orders.mjs` | `buyer`, as duas telas de pedido, as cinco transições |
| `categories.mjs` | CRUD, a contagem de peças, e a promessa da copy de apagar |
| `drive.mjs` | o cliente HTTP com potes de cookie nomeados |
| `fixture.mjs` | semeadura — cada execução cria os próprios produtos |

## Duas coisas que valem saber antes de mexer

**As suítes se semeiam sozinhas.** Cada execução cria produtos próprios, com
slug aleatório. Isso não é capricho: a suíte de remoção apagava tamanhos que a
do painel esperava encontrar, e as duas passavam ou falhavam dependendo da
ordem. Nenhuma delas depende do que outra deixou.

**Login é limitado a 5 por 15 minutos, por IP.** Um BFF põe todo mundo atrás
de um IP só, então re-logar por checagem esgota a cota em segundos — o próprio
`docs/admin-api.md` do backend levanta isso como ressalva de painel construído
assim. Por isso `drive.mjs` guarda os potes de cookie em `.jars.json` e
`fixture.mjs` guarda o token de semeadura em `.seed-token`, ambos ignorados
pelo git. Se esbarrar no limite mesmo assim, reiniciar o commerce-core zera o
contador, que é em memória.

## Uma falha que não é sua

Um `500` isolado com `Connection terminated unexpectedly` no log do
commerce-core é o *pooler* do Supabase derrubando uma conexão ociosa, não uma
regressão. Acontece em qualquer checagem, sem padrão. **Rode de novo antes de
investigar** — se passar, era isso. Se repetir no mesmo lugar, aí é código.

## O que eles não são

Não são teste de unidade e não substituem os do commerce-core, que é onde as
regras de domínio moram. Estes verificam a **integração**: que o painel fala
com a API do jeito que o documento descreve, e que a fronteira de autorização
está onde deveria.
