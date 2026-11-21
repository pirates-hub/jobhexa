import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    // Only unit tests under src/. tests/home/*.spec.js are Playwright e2e
    // specs (they import @playwright/test, which is not a dependency here)
    // and must never be collected by vitest.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    exclude: ['node_modules/**', 'dist/**', 'tests/**'],
  },
});
