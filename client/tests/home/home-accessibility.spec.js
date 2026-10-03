// Home accessibility tests - requires: npx playwright install (+ axe-core for full audit), npm run dev
// Run: npx playwright test tests/home/home-accessibility.spec.js
import { test, expect } from '@playwright/test';

test('hamburger has accessible name and expanded state', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Menu' });
  await expect(toggle).toHaveAttribute('aria-label', 'Menu');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('headings and CTAs keyboard reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  const cta = page.getByRole('link', { name: /Start for free/i }).first();
  await cta.focus();
  await expect(cta).toBeFocused();
});
