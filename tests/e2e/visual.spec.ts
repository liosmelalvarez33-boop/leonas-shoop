import { test, expect } from '@playwright/test';

// Regresión visual: compara capturas contra baseline (primera corrida los crea).
// En CI fallan si hay diff > permitido; actualiza con --update-snapshots.
test.describe('Visual', () => {
  test('home desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('home.png', { fullPage: false, animations: 'disabled' });
  });

  test('catálogo desktop', async ({ page }) => {
    await page.goto('/catalogo');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('catalogo.png', { fullPage: false, animations: 'disabled' });
  });

  test('producto desktop', async ({ page }) => {
    await page.goto('/producto/camisa-floral');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('producto.png', { fullPage: false, animations: 'disabled' });
  });
});
