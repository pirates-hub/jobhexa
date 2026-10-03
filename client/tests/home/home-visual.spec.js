// Home visual regression - requires: npx playwright install, npm run dev
// Run: npx playwright test tests/home/home-visual.spec.js
// First run creates baselines; review diffs before accepting.
import { test, expect } from '@playwright/test';

const shots = [
  { w: 375, h: 667, name: 'mobile-375' },
  { w: 768, h: 1024, name: 'tablet-768' },
  { w: 1366, h: 768, name: 'laptop-1366' },
  { w: 1920, h: 1080, name: 'desktop-1920' },
];

for (const s of shots) {
  test(`visual ${s.name}`, async ({ page }) => {
    await page.setViewportSize({ width: s.w, height: s.h });
    await page.goto('/');
    await expect(page).toHaveScreenshot(`home-${s.name}.png`, { fullPage: true });
  });
}
