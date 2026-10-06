import { test, expect } from "@playwright/test";

test.describe("Jornada Completa do Cliente", () => {
  test("navegação no catálogo, seleção de tamanho, adição à sacola, consulta de CEP e checkout com PIX", async ({
    page,
    context,
  }) => {
    // Permissão de clipboard para validar o botão de copiar PIX
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // 1. Navegação no Catálogo
    await page.goto("/catalogo");
    await expect(page.getByRole("heading", { level: 1, name: "Catálogo" })).toBeVisible();

    const productLink = page.getByRole("link", { name: /Camiseta Básica/i }).first();
    await expect(productLink).toBeVisible();
    await productLink.click();

    // 2. Página de Detalhes do Produto
    await expect(page).toHaveURL(/\/produto\/camiseta-basica/);
    await expect(page.getByRole("heading", { level: 1, name: "Camiseta Básica" })).toBeVisible();
    await expect(page.getByText("R$ 149,90").first()).toBeVisible();

    // Validação de variante indisponível (GG sem estoque) e seleção de variante disponível (M)
    const sizeGG = page.getByRole("button", { name: "GG" });
    await expect(sizeGG).toBeDisabled();

    const sizeM = page.getByRole("button", { name: "M" });
    await expect(sizeM).toBeEnabled();
    await sizeM.click();

    // 3. Adição à Sacola e Autenticação Inline
    const addToBagButton = page.getByRole("button", { name: /Adicionar à sacola/i });
    await expect(addToBagButton).toBeEnabled();
    await addToBagButton.click();

    // Aguarda o painel inline de login aparecer e realiza autenticação
    await expect(page.getByText("Entre para montar sua sacola")).toBeVisible({ timeout: 6000 });
    await page.fill("#signin-email", "cliente@avesso.test");
    await page.fill("#signin-password", "correct horse battery staple");
    await page.getByRole("button", { name: "Entrar" }).click();

    // Aguarda a confirmação de adição à sacola
    await expect(page.getByRole("button", { name: "Na sacola" })).toBeVisible({ timeout: 10_000 });

    // 4. Visualização da Sacola
    await page.goto("/sacola");
    await expect(page.getByRole("heading", { level: 1, name: "Sua sacola" })).toBeVisible();
    await expect(page.getByText("Camiseta Básica").first()).toBeVisible();
    await expect(page.getByText(/Tamanho M/i)).toBeVisible();

    const checkoutLink = page.getByRole("link", { name: "Ir para o checkout" });
    await expect(checkoutLink).toBeVisible();
    await checkoutLink.click();

    // 5. Checkout e Preenchimento Automático de CEP
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByRole("heading", { level: 1, name: "Finalizar pedido" })).toBeVisible();

    // Preenche CEP
    const cepInput = page.locator("#checkout-cep");
    await cepInput.fill("01310-200");

    // Valida auto-preenchimento retornado pela API
    const streetInput = page.locator("#checkout-street");
    await expect(streetInput).toHaveValue("Rua Aurora", { timeout: 8000 });
    await expect(page.locator("#checkout-neighborhood")).toHaveValue("Bela Vista");
    await expect(page.locator("#checkout-city")).toHaveValue("São Paulo");
    await expect(page.locator("#checkout-state")).toHaveValue("SP");

    // Preenche número
    const numberInput = page.locator("#checkout-number");
    await numberInput.fill("148");

    // Aguarda cálculo do frete e seleciona Entrega Padrão
    const freightRadio = page.locator('input[name="shipping-option"]').first();
    await expect(freightRadio).toBeVisible({ timeout: 8000 });
    await freightRadio.check({ force: true });

    // 6. Seleção de Método de Pagamento PIX
    const pixButton = page.getByRole("button", { name: /PIX/i });
    await expect(pixButton).toBeVisible();
    await pixButton.click();
    await expect(pixButton).toHaveAttribute("aria-pressed", "true");

    // 7. Finalização do Pedido
    const finishOrderButton = page.getByRole("button", { name: /Finalizar pedido/i });
    await expect(finishOrderButton).toBeEnabled();
    await finishOrderButton.click();

    // 8. Visualização do Pedido Criado com QR Code PIX
    await expect(page).toHaveURL(/\/pedido\/ord-/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Recebemos seu pedido" })).toBeVisible();
    await expect(page.getByText("Pagamento via PIX")).toBeVisible();
    await expect(page.getByText("Aguardando pagamento").first()).toBeVisible();

    // Valida imagem do QR Code
    const qrCodeImg = page.locator('img[alt="QR Code PIX"]');
    await expect(qrCodeImg).toBeVisible();

    // Valida input Copia e Cola
    const pixPayloadInput = page.locator('input[readonly][value*="br.gov.bcb.pix"]');
    await expect(pixPayloadInput).toBeVisible();

    // Valida botão "Copiar código PIX" e feedback "Copiado!"
    const copyButton = page.getByRole("button", { name: /Copiar código PIX/i });
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    await expect(page.getByRole("button", { name: "Copiado!" })).toBeVisible();

    // Valida botão de verificação
    await expect(page.getByRole("button", { name: /Já fiz o pagamento \(verificar\)/i })).toBeVisible();
  });

  test("checkout com seleção de Cartão de Crédito", async ({ page }) => {
    // 1. Garante item na sacola selecionando tamanho M
    await page.goto("/produto/camiseta-basica");
    await page.getByRole("button", { name: "M" }).click();
    await page.getByRole("button", { name: /Adicionar à sacola/i }).click();

    const loginHeader = page.getByText("Entre para montar sua sacola");
    if (await loginHeader.waitFor({ state: "visible", timeout: 3000 }).then(() => true).catch(() => false)) {
      await page.fill("#signin-email", "cliente@avesso.test");
      await page.fill("#signin-password", "correct horse battery staple");
      await page.getByRole("button", { name: "Entrar" }).click();
    }

    await expect(page.getByRole("button", { name: "Na sacola" })).toBeVisible({ timeout: 10_000 });

    // 2. Vai para a sacola e prossegue para checkout
    await page.goto("/sacola");
    await expect(page.getByRole("heading", { level: 1, name: "Sua sacola" })).toBeVisible();
    await page.getByRole("link", { name: "Ir para o checkout" }).click();

    // 3. Preenche endereço de entrega
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByRole("heading", { level: 1, name: "Finalizar pedido" })).toBeVisible();

    await page.locator("#checkout-cep").fill("01310-200");
    await expect(page.locator("#checkout-street")).toHaveValue("Rua Aurora", { timeout: 8000 });
    await page.locator("#checkout-number").fill("200");

    const freightRadio = page.locator('input[name="shipping-option"]').first();
    await expect(freightRadio).toBeVisible({ timeout: 8000 });
    await freightRadio.check({ force: true });

    // 4. Seleciona Cartão de Crédito
    const cardButton = page.getByRole("button", { name: /Cartão de Crédito/i });
    await expect(cardButton).toBeVisible();
    await cardButton.click();
    await expect(cardButton).toHaveAttribute("aria-pressed", "true");

    // 5. Finaliza pedido
    const finishOrderButton = page.getByRole("button", { name: /Finalizar pedido/i });
    await expect(finishOrderButton).toBeEnabled();
    await finishOrderButton.click();

    // 6. Valida conclusão do pedido
    await expect(page).toHaveURL(/\/pedido\/ord-/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Recebemos seu pedido" })).toBeVisible();
  });
});
