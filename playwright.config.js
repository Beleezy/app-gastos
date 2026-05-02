// Playwright config para CI con GitHub Actions y dev local.
// Ver §6.2 / §55 de planifica.md.
//
// Estrategia para tu plan free de Vercel + GH Actions:
//
//  - Tests E2E SIN deploy a Vercel: el workflow levanta el dev
//    server de Nuxt en un job de Ubuntu de GH Actions y corre
//    Playwright contra http://localhost:3000.
//  - DB: usa una Postgres efímera del workflow (servicio docker)
//    o bien stub server para no consumir Vercel ni Supabase prod.
//  - Auth: bypass de Supabase con un middleware de test que se
//    activa solo si E2E_TEST_TOKEN está presente.
//  - Smoke público (/api/health, headers, manifest) sin login.
//  - Por módulo: tests de UI con login mock y datos fixture.
//
// Variables de entorno aceptadas:
//   BASE_URL         (default: http://localhost:3000)
//   E2E_USE_WEBSERVER ('1' para que Playwright arranque `npm run dev`)
//   E2E_AUTH_BYPASS  ('1' para activar bypass de auth en server)
//   E2E_TEST_TOKEN   token compartido entre workflow y bypass

import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const useWebServer = process.env.E2E_USE_WEBSERVER === '1'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: process.env.E2E_TEST_TOKEN
      ? { 'x-e2e-test-token': process.env.E2E_TEST_TOKEN }
      : undefined,
  },
  projects: [
    {
      name: 'smoke',
      testMatch: /smoke\.spec\.js$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testIgnore: /smoke\.spec\.js$/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'desktop',
      testIgnore: /smoke\.spec\.js$/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: useWebServer
    ? {
        command: 'npm run dev',
        url: BASE_URL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
          E2E_AUTH_BYPASS: '1',
          E2E_TEST_TOKEN: process.env.E2E_TEST_TOKEN || 'e2e-token',
          NUXT_PORT: '3000',
        },
      }
    : undefined,
})
