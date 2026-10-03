// Home interactions + accessibility tests - requires: npx playwright install, npm run dev
// Run: npx playwright test tests/home/home-interactions.spec.js tests/home/home-accessibility.spec.js
import { test, expect } from '@playwright/test';

test('home CTAs navigate without JS errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.getByRole('link', { name: /Start for free/i }).first().click();
  await expect(page).toHaveURL(/register/);
  expect(errors).toEqual([]);
});

test('counters and ring animate on scroll', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.locator('.jh-counter').first()).not.toBeEmpty();
});
