# Upstream-first: quando o buraco é no backend

Este documento é sobre **como trabalhar**, não sobre o que construir. Ele
vale do primeiro commit até o último.

A AVESSO não é a única loja que o [commerce-core](https://github.com/ArtRiv/commerce-core)
vai servir. Ele é um backend feito para ser reusado: cada loja é uma
implantação própria da mesma `main`, com banco próprio, conta Stripe própria
e domínio próprio. A regra que mantém isso vivo está escrita no repositório
dele, em `claude/context.md`:

> Nunca forkar. Toda loja implanta a `main` deste repositório. Se uma loja
> precisa de algo que o commerce-core não tem, isso vira um PR **aqui**, e a
> próxima loja já nasce com aquilo. Diferença entre lojas só existe em
> **configuração**.
>
> O primeiro `if (loja === 'x')` no código é o momento em que isto deixa de
> ser um template e vira dois projetos que divergem até nenhum dos dois ser
> reusável. Template não morre de arquitetura ruim, morre de disciplina.

Traduzindo para este repositório: **quando a API não tem o que a loja
precisa, a resposta padrão não é dar a volta no front-end. É abrir um PR no
commerce-core, testar, mergear, e só então continuar aqui.**

Um contorno "temporário" no front-end é exatamente como o template morre.
Ele nunca é temporário.

---

## O teste de decisão

Quando encontrar uma lacuna, responda três perguntas antes de escrever
qualquer código:

1. **Outra loja precisaria disso?** Uma loja de roupa, uma de café, uma de
   papelaria — todas iam querer? Se sim, é upstream.
2. **É domínio ou é apresentação?** Regra de negócio, dado persistido,
   cálculo de dinheiro, transição de estado, permissão → domínio, é upstream.
   Layout, rota, copy, estado de UI, formatação → apresentação, é aqui.
3. **Dá para resolver aqui sem inventar endpoint e sem duplicar regra de
   negócio?** Se a resposta honesta for não, é upstream.

**A regra que resolve a maioria dos casos sozinha:** se você se pegar fazendo
aritmética com dinheiro, estoque ou frete no front-end para uma tela
funcionar, achou uma lacuna do backend. O front-end formata valores; ele
nunca os calcula.

### Já classificado

| vai para o commerce-core | fica aqui |
| --- | --- |
| Variantes de produto (tamanho/cor/SKU) | Qualquer coisa visual |
| Cupons e descontos | Rotas, navegação, SEO |
| Carrinho de convidado | Copy e microcopy |
| Busca e filtro ricos | Estado de UI da sacola |
| Upload de imagem | Formatação de moeda e data |
| Webhooks de domínio | Estratégia de polling do pedido |
| Qualquer campo novo numa resposta | Cookies e sessão do BFF |
| Qualquer regra de preço, estoque ou frete | Acessibilidade, loading, erro visual |

### O corolário que impede o exagero

Do mesmo documento do backend:

> Generalidade não se inventa antes da hora. Feature entra quando uma loja
> real precisa dela, não porque "alguma loja um dia pode querer".

Ou seja: **não abra PR especulativo.** O gatilho é esta loja precisar da
coisa agora, para uma tela que está sendo construída agora. "Seria legal ter"
não é gatilho.

---

## O procedimento

**0. Pare.** Não construa o contorno "só para destravar". Não é para destravar
e voltar depois — depois não volta.

**1. Diga em voz alta.** Nomeie a lacuna, aplique o teste de decisão, e
proponha o caminho. **A decisão é conjunta:** o dono do projeto decide com
você se aquilo sobe para o commerce-core ou se fica adiado. Não abra um PR no
backend sem esse acordo, e não construa um contorno sem esse acordo também.
Se ficar adiado, registre a divergência no `README.md` deste repositório em
vez de escondê-la.

**2. Traga o repositório para a sessão.** O backend está em
`C:\Users\Arthu\Desktop\code\commerce-core`. Adicione-o como diretório de
trabalho:

```
/add-dir C:\Users\Arthu\Desktop\code\commerce-core
```

Nunca forkar, nunca copiar código dele para cá, nunca "vendorizar" um trecho.

**3. Branch.** `feature/<nome-curto>` a partir da `main`. Merge via PR mesmo
trabalhando sozinho — é prática de portfólio e está na convenção do repo.

**4. Spec antes do código.** Copie `docs/specs/TEMPLATE.md` para
`docs/specs/<nome>.md` e escreva **antes** de implementar. Não precisa ser
longa; o que importa são os critérios de aceitação, porque eles viram os
testes do passo seguinte quase em copia-e-cola. Se a spec mudar no meio da
implementação (vai mudar), edite a spec primeiro.

**5. TDD inside-out.** Para cada critério: teste unitário que falha (red) →
implementação mínima (green) → refactor. Mocke só o que cruza a borda do
módulo, nunca classes do próprio domínio em teste.

**6. e2e como rede de segurança.** Depois que o fluxo funciona ponta a ponta,
escreva o e2e em `test/*.e2e-spec.ts` no nível HTTP. Ele existe para pegar
regressão de integração, não para descobrir design.

**7. Regenere o documento OpenAPI.** `pnpm run openapi:generate`. **O CI falha
se ele estiver desatualizado** — e uma rota que não está nele não existe para
este front-end, porque é dele que sai o cliente tipado.

**8. Atualize a arquitetura.** Se a dependência entre módulos mudou,
`docs/architecture/modules.md` antes do PR. Diagrama desatualizado é pior que
não ter diagrama.

**9. Rode o que o CI roda**, antes de abrir o PR:

```bash
pnpm lint:check && pnpm typecheck && pnpm test && pnpm build
```

**10. PR, revisão, merge.** Conventional commits (`feat:`, `fix:`, ...).

**11. Volte para cá — mas só depois do deploy.** Um PR mergeado não é um PR
implantado. Espere o Render publicar, então regenere o cliente
(`pnpm api:types`) contra a instância publicada e continue a tela que estava
construindo. O tipo novo aparecendo em `schema.d.ts` é a confirmação de que
deu certo.

---

## Armadilhas do backend

Coisas que custam tempo e não estão óbvias nos docs de lá:

- **O e2e dá `TRUNCATE` nas tabelas do banco para onde `DATABASE_URL`
  aponta.** Nunca aponte para o Supabase de produção — você apagaria a loja.
  Projeto de desenvolvimento, sempre.
- **O projeto Supabase pausa quando fica ocioso, e aí o host direto para de
  resolver** (NXDOMAIN, não conexão recusada). Isso derruba migration e e2e
  inteiros. Restaure pelo dashboard antes de mexer em banco. Teste unitário,
  lint, typecheck e build continuam funcionando sem banco — dá para
  implementar quase tudo antes de precisar dele.
- **Rode e2e só via `pnpm test:e2e`**, nunca `npx jest` direto: o script
  define `NODE_OPTIONS=--experimental-vm-modules`, sem o qual o app não sobe.
  Filtre com `pnpm test:e2e -- orders.e2e-spec`.
- **O pre-commit é lint-staged** e um commit pode falhar no lint. Corrija;
  não passe `--no-verify`.
- **O ESLint de lá proíbe número em template literal**
  (`restrict-template-expressions`) — envolva com `String(n)`.
- **Migration é SQL escrito à mão**, com os `ALTER TABLE ... ENABLE ROW LEVEL
  SECURITY` anexados: tabela nova tem que terminar com RLS ligada e nenhuma
  policy. Não invente um caminho novo de migration.
- **Não edite os docs em português via round-trip de string do PowerShell 5.1**
  — a codificação padrão estraga os acentos. Use a ferramenta de edição.

---

## A lacuna que já está identificada

**Variantes de produto.** O design tem seletor de tamanho P/M/G/GG/XGG; a API
tem um produto = um preço = um estoque. Passa nas três perguntas do teste com
folga: toda loja de roupa precisa, é domínio puro (schema, estoque por
variante, item de pedido), e não há como resolver aqui sem inventar campo.

É o primeiro candidato a PR upstream, e o momento natural de levantar isso é
quando o PDP for construído. Ver o `README.md` para o estado atual da
divergência.
