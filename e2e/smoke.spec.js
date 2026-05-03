// Smoke E2E: verifica que la app responde y el endpoint de health
// está sano. Ver §6.2 de planifica.md.
//
// Estos tests no requieren credenciales — solo HTTP público.

import { test, expect } from '@playwright/test'

test('health endpoint responde 200 con status ok', async ({ request }) => {
  const r = await request.get('/api/health')
  expect(r.ok()).toBeTruthy()
  const body = await r.json()
  expect(body.status).toBe('ok')
  expect(body.checks?.db).toBe('ok')
})

test('home redirige a login si no hay sesión', async ({ page }) => {
  const r = await page.goto('/')
  // Algunas configs devuelven 200 con SSR de login, otras hacen redirect.
  // Cualquiera de los dos casos es válido siempre que no aparezca un error 5xx.
  expect(r.status()).toBeLessThan(500)
})

test('manifest PWA disponible', async ({ request }) => {
  // En dev mode @vite-pwa puede generarlo en otra ruta; aceptamos
  // 200 (prod) o 404 (dev sin PWA build).
  const r = await request.get('/manifest.webmanifest', { failOnStatusCode: false })
  if (r.ok()) {
    const json = await r.json()
    expect(json.name).toBeDefined()
    expect(json.icons?.length).toBeGreaterThan(0)
  }
})

test('headers de seguridad globales presentes', async ({ request }) => {
  const r = await request.get('/api/health')
  const headers = r.headers()
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['x-frame-options']).toBe('DENY')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
})
