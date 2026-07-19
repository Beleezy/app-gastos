// Playwright config para CI con GitHub Actions y dev local.
//
// Estrategia:
//  - Tests E2E SIN deploy a Vercel: el workflow levanta el dev server de Nuxt
//    en un job de Ubuntu y corre Playwright contra http://localhost:3000.
//  - DB: Postgres efimera del workflow (servicio docker).
//  - Auth: bypass de Supabase con middleware test (DEV_AUTH_BYPASS=1 + token).
//  - Smoke publico (/api/health, headers, manifest) sin login.
//  - API tests: validan endpoints HTTP (Zod, CRUD, balances).
//  - UI tests: navegan la app real y validan formularios + flujos.
//  - Visual: snapshots con tolerancia 2% para detectar regresiones de diseño.
//
// Variables de entorno aceptadas:
//   BASE_URL          (default: http://localhost:3000)
//   E2E_USE_WEBSERVER ('1' para que Playwright arranque `npm run dev`)
//   DEV_AUTH_BYPASS   ('1' para activar bypass de auth dev en server)
//   DEV_AUTH_TOKEN    token compartido entre workflow y bypass
//   E2E_USER_ID       usuario temporal por defecto para tests
//   E2E_USER_EMAIL    email del usuario temporal por defecto

import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const useWebServer = process.env.E2E_USE_WEBSERVER === '1'

// El tour de onboarding (components/onboarding/TourOverlay.vue) se monta en
// los layouts default/planificador y, en primera visita, se autoabre tras
// requestIdleCallback. Es un overlay z-100 que intercepta clicks en toda la
// UI, lo que rompe los tests E2E que navegan a /registro, /planificador,
// /deudas, etc. Pre-cargamos el estado "tour ya visto" via storageState para
// neutralizarlo en todos los specs. El composable useOnboarding lee
// localStorage al montar y, con tourCompletado=true, deja `activo: false`.
const TOUR_DISMISSED_STORAGE_STATE = {
  cookies: [],
  origins: [
    {
      origin: new URL(BASE_URL).origin,
      localStorage: [
        {
          name: 'onboarding.v1',
          value: JSON.stringify({
            tourCompletado: true,
            tourSaltado: true,
            hintsVistos: [],
          }),
        },
      ],
    },
  ],
}

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 5000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: BASE_URL,
    // Entornos con Chromium preinstalado (p. ej. sandboxes remotos donde no
    // se puede correr `playwright install`): apuntar al binario del sistema.
    ...(process.env.PW_EXECUTABLE_PATH
      ? { launchOptions: { executablePath: process.env.PW_EXECUTABLE_PATH } }
      : {}),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: TOUR_DISMISSED_STORAGE_STATE,
    extraHTTPHeaders:
      process.env.DEV_AUTH_BYPASS === '1' && process.env.DEV_AUTH_TOKEN
        ? {
            'x-dev-auth-token': process.env.DEV_AUTH_TOKEN,
            'x-dev-user-id': process.env.E2E_USER_ID || '00000000-0000-0000-0000-000000000101',
            'x-dev-user-email': process.env.E2E_USER_EMAIL || 'demo1@test.local',
          }
        : undefined,
  },
  projects: [
    {
      name: 'smoke',
      testMatch: /smoke\.spec\.js$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api',
      testMatch: /\/api\/.*\.api\.spec\.js$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      testMatch: /\/ui\/.*\.ui\.spec\.js$/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'desktop',
      testMatch: /\/ui\/.*\.ui\.spec\.js$/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'visual',
      testMatch: /\/visual\/.*\.visual\.spec\.js$/,
      use: { ...devices['Pixel 5'] },
      // Los snapshots se almacenan junto al spec en e2e/visual/__screenshots__/
    },
  ],
  webServer: useWebServer
    ? {
        command: 'npm run dev',
        url: BASE_URL,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
          ...process.env,
          // Compatibilidad con @nuxtjs/supabase en SSR durante E2E
          SUPABASE_KEY: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '',
          SUPABASE_URL: process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || '',
          NUXT_SUPABASE_URL: process.env.NUXT_SUPABASE_URL || process.env.SUPABASE_URL || '',
          NUXT_SUPABASE_KEY: process.env.NUXT_SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '',
          NUXT_PUBLIC_SUPABASE_URL:
            process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
          NUXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
          DEV_AUTH_BYPASS: process.env.DEV_AUTH_BYPASS || '1',
          // Mínimo 16 chars — el middleware 04.dev-auth-bypass rechaza
          // tokens más cortos para evitar configs descuidadas.
          DEV_AUTH_TOKEN: process.env.DEV_AUTH_TOKEN || 'dev-token-e2e-DO-NOT-USE-IN-PROD',
          NUXT_PORT: '3000',
        },
      }
    : undefined,
})
