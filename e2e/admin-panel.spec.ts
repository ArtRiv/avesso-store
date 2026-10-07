import { test, expect } from "@playwright/test";

test.describe("Painel Administrativo (Back Office)", () => {
  test("bloqueio de acesso para usuário não autenticado", async ({ page }) => {
    // 1. Tenta acessar /admin sem sessão ativa
    await page.goto("/admin");

    // O proxy redireciona para a página de login preservando o parâmetro next
    await expect(page).toHaveURL(/\/entrar\?next=%2Fadmin/);
    await expect(page.getByRole("heading", { level: 1, name: "Entrar" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("autenticação de operador e visualização de produtos e variantes", async ({ page }) => {
    // 1. Navega para a tela de login com redirecionamento para o admin
    await page.goto("/entrar?next=/admin/produtos");
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();

    // 2. Preenche credenciais de operador
    await page.fill("#signin-email", "operador@avesso.test");
    await page.fill("#signin-password", "correct horse battery staple");
    await page.getByRole("button", { name: "Entrar" }).click();

    // 3. Verifica acesso ao painel admin
    await expect(page).toHaveURL(/\/admin\/produtos/, { timeout: 15_000 });
    await expect(page.getByText("Operadora AVESSO")).toBeVisible();

    // 4. Valida navegação do painel
    await expect(page.getByRole("link", { name: "Produtos" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pedidos" })).toBeVisible();

    // 5. Valida tabela de produtos
    await expect(page.getByText("Camiseta Básica")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Ativo" })).toBeVisible();

    // Valida exibição dos chips de variantes e quantidade de estoque
    await expect(page.getByRole("cell", { name: /P M G GG/ })).toBeVisible();
    await expect(page.getByRole("cell", { name: "30" })).toBeVisible();
  });

  test("gestão de pedidos e ciclo de vida de status no painel administrativo", async ({ page }) => {
    // 1. Faz login como operador
    await page.goto("/entrar?next=/admin/pedidos");
    await page.fill("#signin-email", "operador@avesso.test");
    await page.fill("#signin-password", "correct horse battery staple");
    await page.getByRole("button", { name: "Entrar" }).click();

    // 2. Acessa listagem de pedidos
    await expect(page).toHaveURL(/\/admin\/pedidos/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Pedidos" })).toBeVisible();

    // Valida filtros de status
    await expect(page.getByRole("link", { name: /Todos/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Criado/i })).toBeVisible();

    // Clica no pedido mockado pelo link exato
    const orderLink = page.locator('a[href="/admin/pedidos/ord-1001"]');
    await expect(orderLink).toBeVisible();
    await orderLink.click();

    // 3. Valida detalhes do pedido
    await expect(page).toHaveURL(/\/admin\/pedidos\/ord-1001/);
    await expect(page.getByText("Marina Duarte")).toBeVisible();
    await expect(page.getByText("Rua Aurora, 148")).toBeVisible();
    await expect(page.getByText("Camiseta Básica")).toBeVisible();

    // 4. Executa transição: CREATED -> PAID ("Marcar como pago")
    const markPaidBtn = page.getByRole("button", { name: "Marcar como pago" });
    await expect(markPaidBtn).toBeVisible();
    await markPaidBtn.click();

    // Valida que o status mudou para Pago
    await expect(page.getByText("Pago").first()).toBeVisible({ timeout: 10_000 });

    // 5. Executa transição: PAID -> SHIPPED ("Marcar como enviado")
    const shipBtn = page.getByRole("button", { name: "Marcar como enviado" });
    await expect(shipBtn).toBeVisible();
    await shipBtn.click();

    // Formulário de rastreio se abre
    const trackingInput = page.locator("#trackingCode");
    await expect(trackingInput).toBeVisible();
    await trackingInput.fill("BR123456789XP");

    const submitShipBtn = page.getByRole("button", { name: "Marcar como enviado" }).last();
    await submitShipBtn.click();

    // Valida que o status mudou para Enviado
    await expect(page.getByText("Enviado").first()).toBeVisible({ timeout: 10_000 });
  });

  test("geração de etiqueta Melhor Envio com 1-clique e integração Bling ERP", async ({ page }) => {
    // 1. Faz login como operador
    await page.goto("/entrar?next=/admin/pedidos/ord-1001");
    await page.fill("#signin-email", "operador@avesso.test");
    await page.fill("#signin-password", "correct horse battery staple");
    await page.getByRole("button", { name: "Entrar" }).click();

    // 2. Aguarda página do pedido
    await expect(page).toHaveURL(/\/admin\/pedidos\/ord-1001/);

    // Se estiver CREATED, marca como pago
    const markPaidBtn = page.getByRole("button", { name: "Marcar como pago" });
    if (await markPaidBtn.isVisible()) {
      await markPaidBtn.click();
      await expect(page.getByText("Pago").first()).toBeVisible({ timeout: 10_000 });
    }

    // 3. Valida card fiscal do Bling ERP
    await expect(page.getByText("Integrado ao Bling ERP")).toBeVisible();

    // 4. Clica em "Gerar Etiqueta" para abrir painel de expedição com cotações
    const gerarEtiquetaBtn = page.getByRole("button", { name: "Gerar Etiqueta" });
    if (await gerarEtiquetaBtn.isVisible()) {
      await gerarEtiquetaBtn.click();

      // Aguarda cotações carregarem
      await expect(page.getByText("Expedir com Melhor Envio")).toBeVisible();
      await expect(page.getByText(/PAC — Correios/i)).toBeVisible();

      // Clica em comprar etiqueta e despachar
      const buyBtn = page.getByRole("button", { name: "Comprar etiqueta e despachar" });
      await expect(buyBtn).toBeVisible();
      await buyBtn.click();

      // Status avança para Enviado e link de download do PDF aparece
      await expect(page.getByText("Enviado").first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole("link", { name: /Baixar Etiqueta/i })).toBeVisible();
    }
  });

  test("navegação e gestão de integrações multi-tenant e marketplaces", async ({ page }) => {
    // 1. Faz login como operador
    await page.goto("/entrar?next=/admin/integracoes");
    await page.fill("#signin-email", "operador@avesso.test");
    await page.fill("#signin-password", "correct horse battery staple");
    await page.getByRole("button", { name: "Entrar" }).click();

    // 2. Aguarda página de integrações
    await expect(page).toHaveURL(/\/admin\/integracoes/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Integrações & Marketplaces" })).toBeVisible();

    // 3. Valida cards de canais
    await expect(page.getByText("Mercado Livre").first()).toBeVisible();
    await expect(page.getByText("Shopee").first()).toBeVisible();
    await expect(page.getByText("Amazon SP-API").first()).toBeVisible();

    // 4. Conexão em 1-clique com Mercado Livre
    const connectBtn = page.getByRole("button", { name: "Conectar com Mercado Livre" });
    if (await connectBtn.isVisible()) {
      await connectBtn.click();
      // O mock-backend redireciona para a tela de integrações com ?connected=true
      await expect(page.getByText(/Mercado Livre conectado com sucesso!/i).first()).toBeVisible({ timeout: 10_000 });
    }

    // 5. Conexão em 1-clique com Shopee
    const connectShopeeBtn = page.getByRole("button", { name: "Conectar com Shopee" });
    if (await connectShopeeBtn.isVisible()) {
      await connectShopeeBtn.click();
      await expect(page.getByText(/Shopee conectada com sucesso!/i).first()).toBeVisible({ timeout: 10_000 });
    }

    // 6. Valida ações disponíveis quando conectado
    await expect(page.getByRole("button", { name: "Sincronizar Catálogo" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Desconectar" }).first()).toBeVisible();
  });
});
