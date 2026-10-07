/**
 * Servidor HTTP Mock BFF/API para testes E2E com Playwright.
 *
 * Simula a API do commerce-core de forma determinística, veloz e sem dependência
 * de banco de dados ou serviços externos (Supabase, Asaas, Mercado Pago, ViaCEP).
 */
import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.MOCK_PORT || 3099);

// Estado inicial mockado
let cart = {
  items: [],
  itemsSubtotalCents: 0,
  itemCount: 0,
};

const defaultProduct = {
  id: 'prod-camiseta-basica',
  name: 'Camiseta Básica',
  slug: 'camiseta-basica',
  description: 'Algodão pesado 240g, corte reto e gola reforçada.',
  priceCents: 14990,
  status: 'ACTIVE',
  weightGrams: 240,
  heightCm: 5,
  widthCm: 20,
  lengthCm: 30,
  categories: [{ id: 'cat-camisetas', name: 'Camisetas', slug: 'camisetas' }],
  category: { id: 'cat-camisetas', name: 'Camisetas', slug: 'camisetas' },
  stockQuantity: 30,
  variants: [
    { id: 'var-p', label: 'P', stockQuantity: 10, isArchived: false, weightGrams: 240, heightCm: 5, widthCm: 20, lengthCm: 30 },
    { id: 'var-m', label: 'M', stockQuantity: 15, isArchived: false, weightGrams: 240, heightCm: 5, widthCm: 20, lengthCm: 30 },
    { id: 'var-g', label: 'G', stockQuantity: 5, isArchived: false, weightGrams: 240, heightCm: 5, widthCm: 20, lengthCm: 30 },
    { id: 'var-gg', label: 'GG', stockQuantity: 0, isArchived: false, weightGrams: 240, heightCm: 5, widthCm: 20, lengthCm: 30 },
  ],
};

let products = [defaultProduct];

let orders = [
  {
    id: 'ord-1001',
    status: 'CREATED',
    totalCents: 16980,
    itemsSubtotalCents: 14990,
    shippingCents: 1990,
    shippingOptionCode: 'padrao-sudeste',
    shippingCarrier: 'Correios',
    shippingEtaDays: 5,
    paymentMethod: 'PIX',
    pixPayload: '00020126580014br.gov.bcb.pix2536e2e-pix-copia-e-cola-test-payload5204000053039865405169.805802BR5912AVESSO STORE6009SAO PAULO62070503***6304ABCD',
    shippingLine1: 'Rua Aurora, 148',
    shippingLine2: 'Apto 42',
    shippingCity: 'São Paulo',
    shippingState: 'SP',
    shippingPostalCode: '01310-200',
    shippingMethodName: 'Entrega padrão',
    shippingMethodCode: 'padrao-sudeste',
    buyerName: 'Marina Duarte',
    buyerEmail: 'cliente@avesso.test',
    paidAt: null,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    refundedAt: null,
    shippingAddress: {
      street: 'Rua Aurora',
      number: '148',
      complement: 'Apto 42',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      postalCode: '01310-200',
    },
    buyer: {
      id: 'user-cust',
      name: 'Marina Duarte',
      email: 'cliente@avesso.test',
    },
    items: [
      {
        variantId: 'var-m',
        productName: 'Camiseta Básica',
        variantLabel: 'M',
        priceCents: 14990,
        quantity: 1,
      },
    ],
    createdAt: new Date().toISOString(),
  },
];

function updateCartTotals() {
  cart.itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  cart.itemsSubtotalCents = cart.items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
}

function sendJson(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
  });
  res.end(json);
}

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = parsedUrl.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    });
    return res.end();
  }

  // Healthcheck
  if (path === '/' || path === '/health') {
    return sendJson(res, 200, { status: 'ok', mock: true });
  }

  // Categorias
  if (path === '/categories' && method === 'GET') {
    return sendJson(res, 200, [
      { id: 'cat-camisetas', name: 'Camisetas', slug: 'camisetas', productCount: 1 },
      { id: 'cat-moletons', name: 'Moletons', slug: 'moletons', productCount: 0 },
    ]);
  }

  // Produtos (listagem)
  if (path === '/products' && method === 'GET') {
    return sendJson(res, 200, {
      items: products,
      total: products.length,
      page: 1,
      perPage: 20,
    });
  }

  // Produto específico (slug ou id)
  if (path.startsWith('/products/') && method === 'GET' && !path.includes('/variants/')) {
    const slugOrId = path.replace('/products/', '');
    const found = products.find((p) => p.slug === slugOrId || p.id === slugOrId);
    if (!found) {
      return sendJson(res, 404, { code: 'PRODUCT_NOT_FOUND', message: 'Produto não encontrado' });
    }
    return sendJson(res, 200, found);
  }

  // Atualizar variante de produto (Admin)
  if (path.startsWith('/products/') && path.includes('/variants/') && method === 'PATCH') {
    const parts = path.split('/');
    const prodId = parts[2];
    const varId = parts[4];
    const body = await parseBody(req);
    const prod = products.find((p) => p.id === prodId || p.slug === prodId);
    if (prod) {
      const variant = prod.variants.find((v) => v.id === varId);
      if (variant) {
        if (typeof body.stockQuantity === 'number') variant.stockQuantity = body.stockQuantity;
        if (typeof body.isArchived === 'boolean') variant.isArchived = body.isArchived;
        return sendJson(res, 200, variant);
      }
    }
    return sendJson(res, 404, { message: 'Variante não encontrada' });
  }

  // Autenticação (Login)
  if (path === '/auth/login' && method === 'POST') {
    const body = await parseBody(req);
    const email = body.email;
    const isOp = email === 'operador@avesso.test';
    const role = isOp ? 'ADMIN' : 'CUSTOMER';
    const name = isOp ? 'Operadora AVESSO' : 'Marina Duarte';

    return sendJson(res, 200, {
      accessToken: `mock-token-${isOp ? 'admin' : 'cust'}`,
      refreshToken: `mock-refresh-${isOp ? 'admin' : 'cust'}`,
      user: {
        id: `user-${isOp ? 'admin' : 'cust'}`,
        email,
        name,
        role,
      },
    });
  }

  // Perfil do usuário atual
  if (path === '/auth/me' && method === 'GET') {
    const authHeader = req.headers.authorization || '';
    const isAdmin = authHeader.includes('admin');

    if (isAdmin) {
      return sendJson(res, 200, {
        id: 'user-admin',
        email: 'operador@avesso.test',
        name: 'Operadora AVESSO',
        role: 'ADMIN',
        permissions: [
          'products.read',
          'products.write',
          'orders.read',
          'orders.write',
          'reports.read',
          'categories.read',
          'categories.write',
        ],
      });
    }

    return sendJson(res, 200, {
      id: 'user-cust',
      email: 'cliente@avesso.test',
      name: 'Marina Duarte',
      role: 'CUSTOMER',
      permissions: ['orders.read'],
    });
  }

  // Sacola (Cart)
  if (path === '/cart' && method === 'GET') {
    return sendJson(res, 200, cart);
  }

  if (path === '/cart/items' && method === 'POST') {
    const body = await parseBody(req);
    const variantId = body.variantId;
    const quantity = body.quantity || 1;

    let targetVariant = null;
    let targetProduct = null;
    for (const p of products) {
      const v = p.variants.find((varItem) => varItem.id === variantId);
      if (v) {
        targetVariant = v;
        targetProduct = p;
        break;
      }
    }

    if (!targetVariant) {
      targetVariant = { id: variantId, label: 'M', stockQuantity: 10 };
      targetProduct = defaultProduct;
    }

    const existingIndex = cart.items.findIndex((i) => i.variantId === variantId);
    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity += quantity;
    } else {
      cart.items.push({
        variantId,
        quantity,
        priceCents: targetProduct.priceCents,
        product: {
          id: targetProduct.id,
          name: targetProduct.name,
          slug: targetProduct.slug,
          status: targetProduct.status,
        },
        variant: {
          id: targetVariant.id,
          label: targetVariant.label,
          stockQuantity: targetVariant.stockQuantity,
        },
      });
    }

    updateCartTotals();
    return sendJson(res, 201, cart);
  }

  if (path.startsWith('/cart/items/') && method === 'PATCH') {
    const variantId = path.replace('/cart/items/', '');
    const body = await parseBody(req);
    const item = cart.items.find((i) => i.variantId === variantId);
    if (item) {
      item.quantity = body.quantity;
      updateCartTotals();
      return sendJson(res, 200, cart);
    }
    return sendJson(res, 404, { message: 'Item não encontrado na sacola' });
  }

  if (path.startsWith('/cart/items/') && method === 'DELETE') {
    const variantId = path.replace('/cart/items/', '');
    cart.items = cart.items.filter((i) => i.variantId !== variantId);
    updateCartTotals();
    return sendJson(res, 200, cart);
  }

  // Consulta de CEP
  if (path.startsWith('/shipping/cep/') && method === 'GET') {
    const cep = path.replace('/shipping/cep/', '').replace(/\D/g, '');
    return sendJson(res, 200, {
      postalCode: `${cep.slice(0, 5)}-${cep.slice(5, 8)}`,
      street: 'Rua Aurora',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
    });
  }

  // Cotação de Frete
  if (path === '/shipping/quote' && method === 'POST') {
    const subtotal = cart.itemsSubtotalCents || 14990;
    return sendJson(res, 200, {
      options: [
        {
          code: 'padrao-sudeste',
          label: 'Entrega padrão',
          carrier: 'Correios',
          priceCents: 1990,
          estimatedDays: 5,
          orderTotalCents: subtotal + 1990,
        },
        {
          code: 'expresso-sudeste',
          label: 'Entrega expressa',
          carrier: 'Sedex',
          priceCents: 2990,
          estimatedDays: 2,
          orderTotalCents: subtotal + 2990,
        },
      ],
      itemsSubtotalCents: subtotal,
    });
  }

  // Checkout / Criação de Pedido
  if (path === '/orders' && method === 'POST') {
    const body = await parseBody(req);
    const orderId = `ord-${Date.now().toString().slice(-6)}`;
    const methodChoice = body.paymentMethod || 'PIX';
    const subtotal = cart.itemsSubtotalCents || 14990;
    const shipping = body.quotedShippingCents || 1990;
    const total = subtotal + shipping;

    const newOrder = {
      id: orderId,
      status: 'CREATED',
      totalCents: total,
      itemsSubtotalCents: subtotal,
      shippingCents: shipping,
      shippingOptionCode: body.shippingOptionCode || 'padrao-sudeste',
      shippingCarrier: 'Correios',
      shippingEtaDays: 5,
      paymentMethod: methodChoice,
      pixPayload: methodChoice === 'PIX' ? '00020126580014br.gov.bcb.pix2536e2e-pix-copia-e-cola-test-payload5204000053039865405169.805802BR5912AVESSO STORE6009SAO PAULO62070503***6304ABCD' : null,
      pixQrCode: methodChoice === 'PIX' ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' : null,
      shippingLine1: body.shippingAddress?.street ? `${body.shippingAddress.street}, ${body.shippingAddress.number || ''}` : 'Rua Aurora, 148',
      shippingLine2: body.shippingAddress?.complement || null,
      shippingCity: body.shippingAddress?.city || 'São Paulo',
      shippingState: body.shippingAddress?.state || 'SP',
      shippingPostalCode: body.shippingAddress?.postalCode || '01310-200',
      shippingMethodName: 'Entrega padrão',
      shippingMethodCode: body.shippingOptionCode || 'padrao-sudeste',
      buyerName: 'Marina Duarte',
      buyerEmail: 'cliente@avesso.test',
      paidAt: null,
      shippedAt: null,
      deliveredAt: null,
      cancelledAt: null,
      refundedAt: null,
      shippingAddress: body.shippingAddress || {
        street: 'Rua Aurora',
        number: '148',
        complement: 'Apto 42',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        postalCode: '01310-200',
      },
      buyer: {
        id: 'user-cust',
        name: 'Marina Duarte',
        email: 'cliente@avesso.test',
      },
      items: cart.items.length > 0 ? [...cart.items] : [
        {
          variantId: 'var-m',
          productName: 'Camiseta Básica',
          variantLabel: 'M',
          priceCents: 14990,
          quantity: 1,
        },
      ],
      createdAt: new Date().toISOString(),
    };

    orders.unshift(newOrder);
    // Limpa a sacola após pedido realizado
    cart.items = [];
    updateCartTotals();

    return sendJson(res, 201, newOrder);
  }

  // Detalhes do Pedido
  if (path.startsWith('/orders/') && method === 'GET') {
    const orderId = path.replace('/orders/', '');
    const found = orders.find((o) => o.id === orderId);
    if (!found) {
      return sendJson(res, 404, { code: 'ORDER_NOT_FOUND', message: 'Pedido não encontrado' });
    }
    return sendJson(res, 200, found);
  }

  // Listagem de Pedidos (Admin)
  if (path === '/orders' && method === 'GET') {
    const statusCounts = {
      CREATED: orders.filter((o) => o.status === 'CREATED').length,
      PAID: orders.filter((o) => o.status === 'PAID').length,
      SHIPPED: orders.filter((o) => o.status === 'SHIPPED').length,
      DELIVERED: orders.filter((o) => o.status === 'DELIVERED').length,
      CANCELLED: orders.filter((o) => o.status === 'CANCELLED').length,
      REFUNDED: orders.filter((o) => o.status === 'REFUNDED').length,
    };

    return sendJson(res, 200, {
      items: orders,
      total: orders.length,
      page: 1,
      perPage: 20,
      statusCounts,
    });
  }

  // Cotação de frete para pedido existente (Admin)
  if (path.startsWith('/orders/') && path.endsWith('/shipping-quotes') && method === 'GET') {
    return sendJson(res, 200, [
      {
        code: 'melhorenvio.1',
        label: 'PAC — Correios',
        priceCents: 1990,
        estimatedDays: 5,
        carrier: 'Correios',
      },
      {
        code: 'melhorenvio.2',
        label: 'SEDEX — Correios',
        priceCents: 3490,
        estimatedDays: 2,
        carrier: 'Correios',
      },
    ]);
  }

  // Compra de etiqueta de envio (Admin)
  if (path.startsWith('/orders/') && path.endsWith('/label') && method === 'POST') {
    const parts = path.split('/');
    const orderId = parts[2];
    const ord = orders.find((o) => o.id === orderId);
    if (!ord) {
      return sendJson(res, 404, { message: 'Pedido não encontrado' });
    }
    ord.status = 'SHIPPED';
    ord.shippedAt = new Date().toISOString();
    ord.trackingCode = 'BR987654321ME';
    ord.labelUrl = 'https://sandbox.melhorenvio.com.br/labels/mock-label.pdf';
    ord.labelPurchasedAt = new Date().toISOString();
    return sendJson(res, 200, ord);
  }

  // Transições de Pedido (Admin: mark-paid, ship, deliver, cancel, refund)
  if (path.startsWith('/orders/') && method === 'POST' && path.split('/').length === 4) {
    const parts = path.split('/');
    const orderId = parts[2];
    const verb = parts[3];
    const body = await parseBody(req);
    const ord = orders.find((o) => o.id === orderId);

    if (!ord) {
      return sendJson(res, 404, { message: 'Pedido não encontrado' });
    }

    if (verb === 'mark-paid') {
      ord.status = 'PAID';
      ord.paidAt = new Date().toISOString();
      ord.blingOrderId = 'bling-999001';
      ord.blingExportedAt = new Date().toISOString();
    } else if (verb === 'ship') {
      ord.status = 'SHIPPED';
      ord.shippedAt = new Date().toISOString();
      ord.trackingCode = body.trackingCode || 'BR123456789XP';
      ord.shippingTrackingCode = body.trackingCode || 'BR123456789XP';
    } else if (verb === 'deliver') {
      ord.status = 'DELIVERED';
      ord.deliveredAt = new Date().toISOString();
    } else if (verb === 'cancel') {
      ord.status = 'CANCELLED';
      ord.cancelledAt = new Date().toISOString();
    } else if (verb === 'refund') {
      ord.status = 'REFUNDED';
      ord.refundedAt = new Date().toISOString();
    }

    return sendJson(res, 200, ord);
  }

  // --- Integrações Multi-Tenant & Marketplaces (Sessão 10 & 11) ---
  if (path === '/integrations' && method === 'GET') {
    return sendJson(res, 200, {
      integrations: [
        {
          provider: 'MERCADO_LIVRE',
          connected: globalThis.__meliConnected ?? false,
          status: globalThis.__meliConnected ? 'ACTIVE' : 'DISCONNECTED',
          expiresAt: '2026-10-06T20:00:00.000Z',
          metadata: { nickname: 'LOJA_OFICIAL_ML', userId: 123456 },
        },
        {
          provider: 'SHOPEE',
          connected: globalThis.__shopeeConnected ?? false,
          status: globalThis.__shopeeConnected ? 'ACTIVE' : 'DISCONNECTED',
          expiresAt: '2026-10-06T22:00:00.000Z',
          metadata: { shopName: 'Loja Oficial Shopee', shopId: 654321 },
        },
        {
          provider: 'AMAZON',
          connected: globalThis.__amazonConnected ?? false,
          status: globalThis.__amazonConnected ? 'ACTIVE' : 'DISCONNECTED',
          expiresAt: '2026-10-07T22:00:00.000Z',
          metadata: {
            sellingPartnerId: 'A21TJRUUN4KGV',
            marketplaceId: 'A2Q3Y263D00KWC',
            dppCompliant: true,
          },
        },
      ],
    });
  }

  if (path === '/integrations/mercadolivre/auth-url' && method === 'GET') {
    globalThis.__meliConnected = true;
    return sendJson(res, 200, {
      url: 'http://localhost:5173/admin/integracoes?connected=true',
    });
  }

  if (path === '/integrations/mercadolivre/callback' && method === 'POST') {
    globalThis.__meliConnected = true;
    return sendJson(res, 200, {
      provider: 'MERCADO_LIVRE',
      connected: true,
      status: 'ACTIVE',
      expiresAt: '2026-10-06T20:00:00.000Z',
      metadata: { nickname: 'LOJA_OFICIAL_ML' },
    });
  }

  if (path === '/integrations/mercadolivre/disconnect' && method === 'POST') {
    globalThis.__meliConnected = false;
    return sendJson(res, 200, { disconnected: true });
  }

  if (path === '/integrations/mercadolivre/sync' && method === 'POST') {
    return sendJson(res, 200, { syncedProducts: 1, totalVariants: 4 });
  }

  if (path === '/integrations/mercadolivre/webhook' && method === 'POST') {
    return sendJson(res, 200, { received: true, action: 'order_imported_successfully' });
  }

  if (path === '/integrations/shopee/auth-url' && method === 'GET') {
    globalThis.__shopeeConnected = true;
    return sendJson(res, 200, {
      url: 'http://localhost:5173/admin/integracoes?connected=shopee',
    });
  }

  if (path === '/integrations/shopee/callback' && method === 'POST') {
    globalThis.__shopeeConnected = true;
    return sendJson(res, 200, {
      provider: 'SHOPEE',
      connected: true,
      status: 'ACTIVE',
      expiresAt: '2026-10-06T22:00:00.000Z',
      metadata: { shopName: 'Loja Oficial Shopee', shopId: 654321 },
    });
  }

  if (path === '/integrations/shopee/disconnect' && method === 'POST') {
    globalThis.__shopeeConnected = false;
    return sendJson(res, 200, { disconnected: true });
  }

  if (path === '/integrations/shopee/sync' && method === 'POST') {
    return sendJson(res, 200, { syncedProducts: 1, totalVariants: 4 });
  }

  if (path === '/integrations/shopee/webhook' && method === 'POST') {
    return sendJson(res, 200, { received: true, action: 'order_imported_successfully' });
  }

  // --- Amazon SP-API ---
  if (path === '/integrations/amazon/auth-url' && method === 'GET') {
    globalThis.__amazonConnected = true;
    return sendJson(res, 200, {
      url: 'http://localhost:5173/admin/integracoes?connected=amazon',
    });
  }

  if (path === '/integrations/amazon/callback' && method === 'POST') {
    globalThis.__amazonConnected = true;
    return sendJson(res, 200, {
      provider: 'AMAZON',
      connected: true,
      status: 'ACTIVE',
      expiresAt: '2026-10-07T22:00:00.000Z',
      metadata: {
        sellingPartnerId: 'A21TJRUUN4KGV',
        marketplaceId: 'A2Q3Y263D00KWC',
        dppCompliant: true,
      },
    });
  }

  if (path === '/integrations/amazon/disconnect' && method === 'POST') {
    globalThis.__amazonConnected = false;
    return sendJson(res, 200, { disconnected: true });
  }

  if (path === '/integrations/amazon/sync' && method === 'POST') {
    return sendJson(res, 200, { syncedProducts: 2, totalVariants: 6 });
  }

  if (path === '/integrations/amazon/notifications' && method === 'POST') {
    return sendJson(res, 200, { received: true, action: 'order_imported_successfully' });
  }

  // Rota padrão 404
  return sendJson(res, 404, { code: 'NOT_FOUND', message: `Rota mock não implementada: ${method} ${path}` });
});

server.listen(PORT, () => {
  console.log(`[mock-backend] Executando na porta ${PORT}`);
});
