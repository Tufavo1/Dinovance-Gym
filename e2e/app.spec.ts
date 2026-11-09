import { expect, test } from '@playwright/test';

/**
 * Pruebas de punta a punta contra el Supabase local (npm run db:start).
 * Usa Chrome instalado en el equipo: npx playwright test --project="Mobile Chrome".
 */

test('sin sesión, la app manda al inicio de sesión', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Bienvenido/a')).toBeVisible();
});

test('el registro exige una contraseña con letras y números', async ({ page }) => {
  await page.goto('/registro');
  const password = page.locator('ion-input[formcontrolname=password] input:not(.cloned-input)');
  await password.click();
  await password.pressSequentially('soloLetras');
  await page.locator('ion-input[formcontrolname=password2] input:not(.cloned-input)').click();
  await expect(page.getByText('Usa letras y números')).toBeVisible();
});

test('las rutas privadas están protegidas', async ({ page }) => {
  for (const path of ['/rutina', '/rutinas', '/perfil', '/home']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});
