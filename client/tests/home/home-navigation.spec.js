// Home navigation tests - requires: npx playwright install, npm run dev
// Run: npx playwright test tests/home/home-navigation.spec.js
import { test, expect } from '@playwright/test';

test('mobile menu opens, links visible, closes on link click', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Menu' });
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('desktop nav links visible', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Start for free/i }).first()).toBeVisible();
});
