// Playwright config minimal para smoke E2E.
// Ver §6.2 de planifica.md.
//
// Para ejecutar localmente:
//   BASE_URL=http://localhost:3000 npx playwright test
//
// En CI lo invocamos con base url y credenciales de test desde GH
// Actions secrets. Hoy queda como scaffolding listo: corremos solo
// lo de specs/smoke.spec.js que valida health.

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
})
