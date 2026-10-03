// Home responsive tests - requires: npx playwright install, npm run dev (port 5173)
// Run: npx playwright test tests/home/home-responsive.spec.js
import { test, expect } from '@playwright/test';

const viewports = [
  { w: 360, h: 640, name: 'mobile-360' },
  { w: 375, h: 667, name: 'mobile-375' },
  { w: 390, h: 844, name: 'mobile-390' },
  { w: 768, h: 1024, name: 'tablet-768' },
  { w: 1366, h: 768, name: 'laptop-1366' },
  { w: 1920, h: 1080, name: 'desktop-1920' },
];

for (const v of viewports) {
  test(`no horizontal overflow at ${v.name}`, async ({ page }) => {
    await page.setViewportSize({ width: v.w, height: v.h });
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
