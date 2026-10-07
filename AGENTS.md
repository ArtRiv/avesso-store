<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Diretrizes Mandatórias de Fluxo de Trabalho (AVESSO Store & Commerce-Core)

## 1. Gestão de Branches, Commits e Pull Requests por Sessão
- **Branch por Sessão:** No início de cada sessão de trabalho, crie ou alterne para uma feature branch dedicada (ex: `feat/session-11-shopee`). Nunca trabalhe direto na `main` ou deixe alterações desordenadas.
- **Commits Estruturados:** Ao longo e ao término do trabalho, realize commits atômicos e descritivos seguindo Conventional Commits (`feat(...)`, `fix(...)`, `test(...)`, `docs(...)`).
- **Pull Request Obrigatório:** Toda sessão deve concluir com as alterações commitadas na branch correspondente, com build e testes 100% verdes, e fornecer instruções claras para o usuário revisar e aprovar o Pull Request (PR) correspondente.
- **Upstream-First:** Mudanças de regras de negócio e dados sempre nascem no `commerce-core`, geram OpenAPI (`pnpm run openapi:generate`), e sincronizam tipos no front (`pnpm api:types`).
- **Qualidade Contínua:** Nunca finalizar uma sessão sem garantir 100% de sucesso em `pnpm test`, `pnpm test:e2e` e `pnpm build` em ambos os repositórios.

