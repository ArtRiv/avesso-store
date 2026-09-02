# Backlog — o que sobrou, em PRs

Cada entrada abaixo é **um PR**, escrita para ser pega por uma conversa nova
sem contexto nenhum: o que motivou, o que mudar, onde, e como saber que ficou
pronto.

A origem é o roteiro de conferência pós-deploy e os **17 comentários** que o
dono da loja deixou nele em 31/08 e 01/09/2026. Onde a entrada cita a
observação dele, a citação é literal — é ela que decide o que é "certo", não a
minha paráfrase.

## Como usar isto

1. Escolha **uma** entrada. Não junte duas porque parecem pequenas.
2. Leia o `CLAUDE.md`, o `AGENTS.md` e os três arquivos de `docs/` antes de
   escrever código. As não-negociáveis valem aqui como valeram até agora.
3. Entrada marcada `commerce-core` **não se resolve neste repositório.** Siga o
   `docs/upstream-first.md`: spec antes do código, decisão conjunta antes do
   PR, e volte para cá só depois do deploy e do `pnpm api:types`.
4. Conventional commits, um por fatia que funciona. Nunca `--no-verify`.
5. Ao terminar, marque a entrada como feita aqui mesmo, no mesmo PR.

## Legenda

| marca | o que quer dizer |
| --- | --- |
| `frontend` | resolve-se neste repositório |
| `commerce-core` | lacuna de backend — PR lá, e a decisão de subir é conjunta |
| `decidir` | tem uma escolha em aberto que precisa de resposta antes do código |
| `verificar` | pode não ser trabalho nenhum; confirme primeiro |

---

## Antes de qualquer coisa

### V-1 · ✅ feito · A `main` está 11 commits atrás

`feat/admin-panel` tem 11 commits que a `main` não tem, incluindo **a tela de
relatórios inteira**, as quatro rotas do BFF, a suíte de testes e a edição de
fotos do produto. Está tudo empurrado para o `origin`, nada se perdeu.

Antes de abrir qualquer PR novo: abra o PR de `feat/admin-panel` para a `main`
e mergeie, ou os próximos PRs vão nascer de uma base que não tem essas telas.
Confirme também de qual branch a Vercel está publicando — os comentários do
roteiro mostram relatórios funcionando, então provavelmente não é da `main`.

**Resultado: não havia trabalho.** O PR #4 (`feat/admin-panel` → `main`) já
tinha sido mergeado em 01/09, e `origin/main` já continha os onze commits
(`git rev-list --count origin/main..origin/feat/admin-panel` devolve `0`). O
que estava atrasado era só o clone local, resolvido com `git pull --ff-only`.
Fica de pé a segunda metade: **de qual branch a Vercel publica ainda não foi
confirmado**, e isso só se responde no painel da Vercel.

### V-2 · ✅ feito · O filtro de status do painel

> "Não entendi pq n tem o filtro de status"

O código **tem** esse filtro: `ProductFilters` em
`src/app/admin/produtos/product-filters.tsx` desenha um `select` com Todos /
Ativos / Rascunhos / Arquivados, ao lado da busca e da ordenação.

Três explicações possíveis, e a ordem de checagem é esta: (a) o build publicado
é anterior a ele — ver V-1; (b) ele está na tela e passou despercebido, e aí o
trabalho é de destaque visual e não de função; (c) está renderizando quebrado.
**Confirme qual antes de mudar qualquer coisa.**

**Resultado: (b), e com uma causa concreta.** Não é (a): o
`product-filters.tsx` entrou no commit `30f0543`, que subiu no PR #3 em
28/08 — estava publicado quando ele olhou.

O que havia é que **o controle não parecia um controle**. O `select` leva
`appearance-none`, que tira a seta do navegador, e nada era desenhado no
lugar: sobrava uma caixa com borda, o rótulo `Status` e um texto — legenda, e
não algo que abre. O lado da loja já desenhava o `ChevronIcon` em
`catalog-controls.tsx`; o painel não, apesar de o `admin-icons.tsx` dizer em
comentário que reusa esse ícone.

**A correção**, portanto, é de destaque visual e não de função: o chevron volta
aos dois `select` do filtro (Status e Ordem) e ao `StatusSelect` do editor de
produto, que tinha exatamente o mesmo defeito, com o `padding` à direita
aberto para caber o ícone. Nenhum comportamento mudou.

---

## Frontend

### FE-1 · `frontend` · Menu da conta, e a porta de entrada do painel

Três comentários, um controle só.

> "Não tem botão de deslogar, tentei clicar em 'Conta' mas me leva para uma
> página dos meus pedidos […] poderiamos fazer com que ao invés de levar para
> meus pedidos, abrisse um dropdown-menu do shadcn que mostrasse opções como
> 'Meus pedidos', 'Sair', o nome da pessoa e outras opções que façam sentido"

> "Sinceramente não achei onde entrar no dashboard de admin com minha conta"

> "Só não entendi pq n tem botão de 'Admin' ou enfim o nome do botão pode ser
> 'Dashboard' Back-Office qualquer coisa que leve até essa página de admin"

**O que fazer.** `Conta` no header vira um menu em vez de um link. Itens: o
nome de quem está logado, `Meus pedidos`, `Back office` (só para quem tem
acesso) e `Sair`. Sem sessão, continua levando para `/entrar`.

**Duas coisas que essa tela esbarra, e as duas já estão registradas no
`README.md`:**

- **O nome de quem está logado não existe neste lado.** Não há `/auth/me`, e o
  access token carrega só `{ sub }`. Ou o menu abre sem o nome, ou o nome é
  gravado num cookie no login — o `docs/upstream-first.md` põe cookie e sessão
  do BFF deste lado, então isso é resolvível aqui. **Escolha a segunda**: é o
  mesmo trabalho que destrava o e-mail na barra do painel, que hoje renderiza
  vazio pelo mesmo motivo.
- **Saber se mostra `Back office` custa uma requisição.** `adminAccess()`
  (`src/lib/admin/session.ts`) pergunta isso à API, e o header está em toda
  página da loja. Fazer essa pergunta em toda navegação é caro. Grave também
  no cookie de sessão, no login, junto com o nome.

**Arquivos.** `src/components/site-header.tsx`, `src/lib/auth/cookies.ts`,
`src/app/api/auth/login/route.ts`, e o `AdminShell` para finalmente receber o
e-mail que hoje é `null`.

**Pronto quando.** Deslogar sai do menu, `Back office` aparece só para conta
com acesso e não aparece para cliente, e a barra do painel mostra o e-mail de
verdade em vez de nada.

---

### FE-2 · `frontend` · Fotos de produto aparecem na loja

Não saiu de comentário: saiu da conferência do código, e é a maior lacuna
aberta. **Hoje dá para salvar URLs de imagem no painel e não ver nenhuma na
loja.**

`src/components/product-image.tsx` sempre desenha o `ToneBlock` — o bloco de
cor com o nome no canto. O único `<img>` do projeto é a miniatura dentro do
editor. A API guarda `imageUrls` como lista de strings e não hospeda nada.

**O que fazer.**

1. Escolher onde os arquivos moram. O Supabase Storage já está no stack.
2. `ProductImage` passa a renderizar `imageUrls[0]` quando existe, e a cair no
   `ToneBlock` quando não existe — as doze peças continuam funcionando enquanto
   você preenche uma de cada vez.
3. A PDP ganha a pilha de três imagens do artboard 04. Não é carrossel.
4. `next.config.ts` está **vazio**: sem `images.remotePatterns` apontando para
   o host escolhido, o `next/image` não carrega nada externo.
5. `docs/design-system.md` §4: quando a foto entra, o rótulo do canto sai.

**Pronto quando.** Uma peça com foto mostra foto na home, no catálogo, na PDP,
na sacola e na linha do pedido; uma peça sem foto continua exatamente como
hoje, sem buraco no layout.

---

### FE-3 · `frontend` · Sacola: a lixeira no lugar do `−`, e esvaziar

> "quando só tem uma únidade do item eu imaginei que o - fosse excluir o item
> da minha sacola, é o que geralmente acontece. Então ao invés de desabilitar o
> botão de - […] no lugar do - quando o item tiver apenas 1 unidade coloca um
> iconezinho de lixeira"

> "Funcionou, mas sinto que deveria ter um botão em algum lugar de limpar o
> carrinho"

**O que fazer.** Na linha da sacola, quando a quantidade é 1, o `−` vira a
lixeira e remove a linha. E um `Esvaziar sacola` no resumo.

**Cuidado.** Não existe rota que esvazie a sacola de uma vez — é
`DELETE /cart/items/{variantId}` por linha. Fazer N requisições em paralelo é
aceitável para uma sacola de loja de roupa, mas **peça confirmação antes**:
esvaziar é destrutivo e não tem desfazer.

**Arquivos.** `src/app/sacola/cart-view.tsx`, `src/components/admin-icons.tsx`
já tem o `TrashIcon` — reuse, não redesenhe.

---

### FE-4 · `frontend` · PDP: o feedback de adicionar, o aviso de tamanho, o badge

Três comentários da mesma tela.

> "adicionei o boné 2 vezes, depois do primeiro clique apareceu 'NA SACOLA',
> tudo certo, mas dai quando apertei de novo, funcionou adicionou o botão mudou
> ali por um tempo mostrando o feedback mas dai voltou para 'NA SACOLA' o que
> fica um pouco confuso se adicionou ou não, talvez um feedback a mais, ou a
> sacola tbm poder ser um dropdown que mostra o feedback, ou no próprio botão
> aparecer ali a quantidade"

> "mostra 'escolha um tamanho' mas sinceramente é meio dificil de ver isso,
> talvez um tooltip quando da hover no botão seria mais interessante"

> "aparece ali com essa cor 'moss'. Mas ele ocupa todo o width o que é meio
> estranho, talvez a border dele só ocupar o tamanho necessário do texto"

**O que fazer.**

1. O botão passa a dizer **quantas** unidades daquele tamanho já estão na
   sacola. `NA SACOLA (2)` responde a pergunta que o comentário faz.
2. O aviso de tamanho vira tooltip no hover do botão, mantendo o texto
   acessível para teclado e leitor de tela — tooltip sozinho não é acessível.
3. O badge de estoque encolhe para o conteúdo. É bug de layout: o `Badge` em
   `src/components/badge.tsx` é `inline-block`, então o `w-full` está vindo do
   contêiner na PDP.

**Cuidado com o §7.** Nada de sombra e nada de canto arredondado no tooltip.

---

### FE-5 · `frontend` · Catálogo: buscar sem Enter, e o seletor de ordenação

> "Funciona mas tenho que apertar Enter, o meu natural foi digitar e esperar
> trocar, acho que é interessante colocar um deferred ai"

> "o botão de ordenar quando ta com o 'Mais recente' fica cortando o 'Mais
> recente' […] eu prefiriria se ele mostrasse o conteúdo inteiro do filtro
> atual. Outra coisa é que o dropdown que abre quando clica é muito
> pequenininho, seria mais interessante se ele cobrisse o width inteiro do
> botão"

**O que fazer.** Busca com debounce que escreve na query string sozinha, sem
Enter — e sem perder o foco nem a posição do cursor a cada navegação. O `select`
de ordenação passa a caber o rótulo inteiro, e o menu nativo acompanha a
largura do controle.

**Cuidado.** O `select` de hoje é nativo de propósito
(`src/app/admin/produtos/product-filters.tsx` explica: é correto no teclado, no
leitor de tela e no celular, de graça). A largura do popup nativo **não é
estilizável** — cumprir a segunda metade do pedido significa trocar por um
menu do Radix. Vale o custo? É a única decisão desta entrada.

Vale para os dois lugares: o catálogo da loja e o painel.

---

### FE-6 · `frontend` · Um estado de carregamento na troca de filtro

> "Funciona, só que leva um tempinho, o que não tem problema, as vezes ser
> instantaneo não é tão legal também, mas eu gostaria que tivesse pelo menos um
> loading, skeleton ou qualquer coisa assim quando trocasse de filtro."

Foi dito sobre relatórios, mas vale para tudo que filtra por query string:
catálogo, produtos, pedidos, relatórios. Toda essa navegação é server component,
então a página só troca quando a resposta chega — e nesse intervalo nada na tela
diz que algo está acontecendo.

**O que fazer.** `loading.tsx` por rota, e/ou `useLinkStatus` do Next 16 para
marcar o controle que foi clicado.

**Cuidado, e é o que decide a forma.** O `docs/design-system.md` §7 **proíbe
spinner**, sem exceção. O que a loja tem é a barra de espera da §2 — trilho de
2px em hairline com preenchimento de 30% em rust varrendo — que já existe como
`src/components/wait-bar.tsx` e já é usada na confirmação do pagamento. É a
peça certa. Um skeleton cinza também serve para tabela, desde que seja bloco
hairline e não retângulo arredondado pulsando.

---

### FE-7 · `frontend` · A linha de totais dos relatórios

Depende de **BE-2**. O artboard desenha quatro figuras sobre o gráfico —
Receita, Itens, Frete, Pedidos — e a resposta não tem soma da janela, então
hoje a tela diz isso no lugar da linha. Quando o `totals` existir, a linha entra
e a frase sai.

Não comece esta antes da BE-2 estar implantada e o `pnpm api:types` regenerado.

---

### FE-8 · `frontend` · A tela `/admin/acesso`

Depende de **BE-3**. Ver a seção "Acesso" no fim deste arquivo.

---

## commerce-core

### BE-1 · `commerce-core` · A página da Stripe em português

> "sei que é configuração da stripe mas no caso ta aparecendo em ingles o
> feedback no checkout da stripe."

Quem cria a sessão é o backend, então é lá. `locale` na criação da Checkout
Session resolve — e deve sair de configuração da instância, não fixo no código:
o commerce-core serve mais de uma loja e a próxima pode não ser brasileira.
Provavelmente `STRIPE_LOCALE`, com `auto` como padrão.

É o menor PR desta lista e um bom primeiro contato com o procedimento do
`docs/upstream-first.md`.

---

### BE-2 · `commerce-core` · Totais da janela em `/reports/revenue`

Já registrado no `README.md` em "Divergências conhecidas — em aberto". O
`RevenueReportResponse` traz `buckets` e nenhuma soma da janela, e somar no
front-end seria uma segunda definição de receita do período — o spec não diz se
o primeiro e o último bucket são recortados na janela ou transbordam dela.

**A forma proposta:** um objeto `totals` ao lado de `buckets`, com
`revenueCents`, `itemsSubtotalCents`, `shippingCents` e `orderCount` — os mesmos
quatro campos que o bucket já tem. A spec precisa dizer explicitamente o que
acontece com bucket parcial, porque é exatamente o que falta hoje.

Destrava a **FE-7**.

---

### BE-3 · `commerce-core` · Gestão de acesso

> "Vamos fazer esse, uma parte ali para o admin conseguir gerir o acesso."

**O modelo já existe e já é aplicado.** Isto é o achado que muda o tamanho do
trabalho: há 14 permissões no catálogo
(`src/auth/authz/permissions.ts`), três papéis padrão
(`src/auth/authz/role-permissions.ts`), e uma tabela `user_permissions` que
concede permissão avulsa a um usuário por cima do papel dele, com
`grantedById` e `grantedAt`. O `jwt.strategy.ts` já soma papel + avulsas em
**toda** requisição autenticada. Não há sistema a construir.

O que não existe é rota. Nenhum dos 34 endpoints lista usuário, troca papel ou
concede permissão — hoje isso só se faz com `UPDATE` no banco.

**O buraco exato do caso dele:** `operator` lê o catálogo mas **não** pode
criar, editar nem apagar produto. Um funcionário que cadastra peças não é
nenhum dos três papéis de hoje.

**As respostas dele às quatro perguntas de política:**

> "Sim, uma permissão nova, o admin pode também, mas imagino que ele vá querer
> também poder ter um outro 'sub-chefe' fazendo esse trabalho por ele"

Ou seja: **`staff.manage` é uma permissão concedível**, não "quem é admin".
É o que permite delegar a delegação.

> "Sim, a loja n pode ficar sem admin"

Guarda de último admin: a operação é recusada se ela deixaria a loja sem
ninguém capaz de administrar. Vale para rebaixar, suspender e arquivar.

**Escopo sugerido do PR:** a permissão `staff.manage`; listar contas de equipe;
trocar o papel de uma conta; conceder e revogar permissão avulsa; a guarda de
último admin. Convite por e-mail pode ficar para depois — promover uma conta
que já existe resolve o caso e é bem menos superfície.

Destrava a **FE-8**.

---

### BE-4 · `commerce-core` · Ciclo de vida da conta

> "tem que pensar no caso se alguém for demitido ou algo do tipo, férias, poder
> pausar a conta da pessoa ou excluir/arquivar"

É PR próprio e não um campo a mais na BE-3, porque **mexe na autenticação**:
uma conta suspensa tem que parar de funcionar agora, o que significa recusar no
`jwt.strategy` e revogar a família de refresh tokens. Suspender sem isso é um
botão que não faz nada por quinze minutos.

Três estados a distinguir, e a spec precisa separá-los: **férias** (pausa
reversível, a pessoa volta), **demissão** (acesso acaba, o histórico do que ela
fez continua), **exclusão** (o dado da pessoa sai — e aí é BE-5).

Um detalhe que já está do lado certo: as permissões são resolvidas do banco a
cada requisição, então revogar já é imediato. Vale escrever isso como garantia
testada, em vez de deixar como acidente feliz.

---

### BE-5 · `commerce-core` · LGPD

> "tem que ver questão de lgpd"

**Isto é conversa antes de tarefa, e não deve virar PR sem discussão.** A
tensão central é concreta: o direito à eliminação encontra o pedido, que é
registro fiscal e não pode simplesmente sumir. A saída usual é anonimizar a
pessoa e preservar o pedido — mas "usual" não é decisão, e essa é sua.

O que precisa de resposta antes de qualquer código: que dado pessoal a loja
guarda hoje e por quanto tempo; o que acontece com o pedido quando a conta é
excluída; quem no time pode ver dado de cliente (`customers.read` existe no
catálogo e hoje só preenche o `buyer` do pedido); e se exportar os próprios
dados é requisito.

Abra uma conversa separada só para isso. Ela decide a spec da BE-4 também.

---

## Decidir antes de codar

### D-1 · `decidir` · Preenchimento de endereço por CEP

> "Mesmo já tendo sido decidido, prefiro que o campo de cep deveria chamar
> aquela API que retorna os dados do endereço e automaticamente já preencher os
> dados do usuário para facilitar."

Ele releu a decisão registrada e decidiu o contrário — então **está decidido
que vai ter**. O que falta é só onde mora, e o `docs/upstream-first.md` não dá
a resposta óbvia:

- **Aqui.** É consulta pura, não persiste nada, não é regra de negócio, e o BFF
  já existe para não expor origem de API ao navegador. Uma rota
  `/api/cep/[code]` chamando o ViaCEP resolve numa tarde.
- **No commerce-core.** O teste de decisão pergunta "outra loja precisaria
  disso?" — toda loja brasileira, sim. E o `README.md` já registra que "chamar
  um serviço de CEP daqui seria uma integração que só esta loja teria".

**Minha recomendação: aqui, e registrar no README por quê.** Endereço é do
comprador e o CEP não vira dado persistido novo — o que o backend guarda
continua sendo `line1/line2/city/state/postalCode`, exatamente como hoje. Se
uma segunda loja precisar, aí sobe, e o custo de mover é uma rota.

Duas coisas que a implementação não pode esquecer: o ViaCEP responde
`{ erro: true }` com status 200 para CEP inexistente, e o endereço precisa
continuar **editável** depois de preenchido — o serviço erra número e
complemento sempre.

---

### D-2 · `decidir` · O menu de ordenação nativo vira Radix?

Sub-decisão da **FE-5**, isolada aqui porque troca uma escolha deliberada. A
largura do popup de um `<select>` nativo não é estilizável. Atender "que ele
cobrisse o width inteiro do botão" exige um menu do Radix, e aí a loja assume
teclado, leitor de tela e comportamento em celular que hoje vêm de graça.

A primeira metade do pedido — não cortar o rótulo — resolve-se sem trocar nada.

---

## Documentação

### D-3 · `frontend` · Dois trechos do README que venceram

Podem entrar de carona em qualquer PR:

- O aviso de que o `scripts/seed-catalog.mjs` vai quebrar com o PR de variantes.
  Ele **já foi atualizado**: manda `variants` e existe `scripts/size-grids.mjs`.
- A divergência dizendo que as doze peças só têm a variante `Único`. O catálogo
  publicado tem grades reais — `P/M/G/GG`, `38/40/42/44`, `39–42/43–46`. Só o
  boné é `Único`, o que está correto para um boné.

---

## Ordem sugerida

1. **V-1** — mergear `feat/admin-panel`, senão tudo nasce torto.
2. **V-2** — o filtro de status pode não ser trabalho nenhum.
3. **FE-1** — é a queixa que aparece três vezes, e destrava o e-mail do painel.
4. **FE-2** — fotos. É o que falta para a loja parecer uma loja.
5. **BE-1** — pequeno, e ensina o caminho do upstream.
6. **FE-3**, **FE-4**, **FE-5**, **FE-6** — em qualquer ordem.
7. **BE-5** conversa → **BE-3** → **BE-4** → **FE-8**.
8. **BE-2** → **FE-7**, quando der vontade.
