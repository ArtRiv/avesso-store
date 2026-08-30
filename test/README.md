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

   **Criar as duas contas é registrar e depois corrigir no banco**, porque
   verificar e-mail e promover não têm rota — aqui nem na API, de propósito:

   ```bash
   # com o commerce-core de pé na :3000, apontado para o schema e2e
   curl -X POST localhost:3000/auth/register -H 'content-type: application/json' \
     -d '{"email":"cliente@avesso.test","password":"correct horse battery staple","name":"Marina Duarte"}'
   curl -X POST localhost:3000/auth/register -H 'content-type: application/json' \
     -d '{"email":"operador@avesso.test","password":"correct horse battery staple","name":"Operadora AVESSO"}'
   ```

   ```sql
   update e2e.users set email_verified_at = now(), updated_at = now()
   where email in ('operador@avesso.test', 'cliente@avesso.test');

   update e2e.users set role_id = (select id from e2e.roles where name = 'admin'),
     updated_at = now()
   where email = 'operador@avesso.test';
   ```

   `Marina Duarte` não é decorativo: `orders.mjs` afirma que o comprador volta
   com esse nome.

   **O papel `admin` precisa carregar `reports.read`.** Ela é a permissão das
   quatro rotas de relatório e é separada de `products.read` e `orders.read`:
   um `admin` de um schema criado antes da migration de relatórios abre o
   painel, chega em `/admin/relatorios` e leva 403 em tudo — que é justamente
   um dos estados que `reports.mjs` verifica, e por isso a suíte inteira
   falharia sem dizer o motivo. `pnpm e2e:setup` no commerce-core reconstrói o
   schema com o catálogo de permissões atual, e apaga as contas junto: depois
   dele, os comandos acima rodam de novo.

## O que cada arquivo é

| arquivo | o que cobre |
| --- | --- |
| `panel.mjs` | fronteira de autorização, listagem, renomear, reordenar, estoque, adicionar, salvar, arquivar |
| `removal.mjs` | os três estados da remoção de tamanho, **incluindo a corrida** |
| `orders.mjs` | `buyer`, as duas telas de pedido, as cinco transições |
| `categories.mjs` | CRUD, a contagem de peças, e a promessa da copy de apagar |
| `reports.mjs` | a fronteira de `reports.read` nas quatro rotas, a janela meio-aberta, o snapshot de sacolas, e as duas listas complementares |
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
