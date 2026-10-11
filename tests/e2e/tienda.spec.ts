import { test, expect } from '@playwright/test';

test.describe('Tienda Leonas Shoop', () => {
  test('home carga con hero, categorías y destacados', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Leonas Shoop/);
    await expect(page.getByRole('heading', { name: /Leonas Shoop/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Ver catálogo/i }).first()).toBeVisible();
    // Categorías y destacados hidratados
    await expect(page.locator('[data-categorias="grid"] a').first()).toBeVisible();
    await expect(page.locator('#destacados-grid article').first()).toBeVisible();
  });

  test('catálogo filtra por búsqueda y categoría', async ({ page }) => {
    await page.goto('/catalogo');
    await expect(page.getByRole('heading', { name: 'Catálogo' })).toBeVisible();
    const total = await page.locator('#grid > div:not(.hidden)').count();
    expect(total).toBeGreaterThan(0);

    // Buscar
    await page.fill('#f-buscar', 'camisa');
    await expect(page.locator('#grid > div:not(.hidden)').first()).toContainText(/camisa/i);

    // Limpiar y filtrar por categoría
    await page.click('#f-limpiar');
    await page.selectOption('#f-categoria', 'zapatos');
    const visibles = await page.locator('#grid > div:not(.hidden)').count();
    expect(visibles).toBeGreaterThan(0);
    // Todos los visibles son zapatos
    const cats = await page.locator('#grid > div:not(.hidden)').evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).dataset.categoria)
    );
    expect(new Set(cats).size).toBe(1);
    expect(cats[0]).toBe('zapatos');
  });

  test('página de producto tiene SEO (JSON-LD, breadcrumbs, relacionados)', async ({ page }) => {
    await page.goto('/producto/camisa-floral');
    await expect(page.getByRole('heading', { name: 'Camisa floral' }).first()).toBeVisible();
    // JSON-LD Product + Breadcrumb
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.join(' ')).toContain('"@type":"Product"');
    expect(ld.join(' ')).toContain('BreadcrumbList');
    // Migas + relacionados
    await expect(page.getByLabel('Migas de pan')).toBeVisible();
    await expect(page.getByRole('heading', { name: /interesar/i })).toBeVisible();
  });

  test('flujo carrito: añadir desde detalle modal y ver en carrito', async ({ page }) => {
    await page.goto('/catalogo');
    // Abrir modal detalle del primer producto con talla
    await page.locator('#grid a[href*="/producto/"]').first().click();
    await page.waitForURL(/\/producto\//);
    // En página producto: ir al catálogo modal para añadir (botón "Elegir talla")
    await page.getByRole('link', { name: /Elegir talla/i }).click();
    await page.waitForURL(/\/catalogo\?p=/);
    // El modal debe abrirse
    const dlg = page.locator('#detalle');
    await expect(dlg).toBeVisible({ timeout: 5000 });
    // Elegir primera talla si hay
    const tallas = page.locator('#detalle [data-talla]');
    if (await tallas.count() > 0) {
      await tallas.first().click();
    }
    await page.locator('#detalle #btn-add').click();
    await expect(page.getByText(/Añadido al carrito/i)).toBeVisible({ timeout: 5000 });
    // Ir al carrito
    await page.goto('/carrito');
    await expect(page.locator('#cart-items .card').first()).toBeVisible();
  });

  test('carrito muestra selector de pago y valida nombre', async ({ page }) => {
    await page.goto('/carrito');
    // Si está vacío, añadir algo vía localStorage directo
    await page.evaluate(() => {
      localStorage.setItem(
        'leonas_shoop_cart_v1',
        JSON.stringify([{ id: 'camisa-floral', titulo: 'Camisa floral', precio: 1800, talla: 'M', cantidad: 1, imagen: 'camisa-floral.svg' }])
      );
    });
    await page.reload();
    await expect(page.getByText('Método de pago')).toBeVisible();
    await expect(page.getByLabel(/Efectivo/)).toBeVisible();
    await expect(page.getByLabel(/Transfermóvil/)).toBeVisible();
    // Sin nombre → toast error
    await page.getByRole('button', { name: /Enviar pedido/i }).click();
    await expect(page.getByText(/Escribe tu nombre/i)).toBeVisible({ timeout: 5000 });
  });
});
