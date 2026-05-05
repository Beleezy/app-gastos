// E2E de seguridad: rate limit, headers, IDOR, validación.

import { test, expect } from '@playwright/test'

test.describe('Seguridad', () => {
  test('API: rate limit en /api/voz/parse devuelve 429 al excederse', async ({ request }) => {
    // 21 requests rápidos al voz/parse — el 21º debe ser 429.
    const responses = []
    for (let i = 0; i < 21; i++) {
      const r = await request.post('/api/voz/parse', {
        data: { texto: `prueba ${i}` },
        failOnStatusCode: false,
      })
      responses.push(r.status())
    }
    // Al menos uno debe ser 429
    expect(responses).toContain(429)
  })

  test('API: input demasiado largo en voz/parse → 413', async ({ request }) => {
    const r = await request.post('/api/voz/parse', {
      data: { texto: 'a'.repeat(3000) },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(413)
  })

  test('API: imagen sobre 8MB → 413', async ({ request }) => {
    const r = await request.post('/api/voz/parse-image', {
      data: { image: 'a'.repeat(9_000_000) },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(413)
  })

  test('Headers de seguridad globales están presentes', async ({ request }) => {
    const r = await request.get('/api/health')
    const headers = r.headers()
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['permissions-policy']).toContain('camera=(self)')
  })

  test('Rate limit headers presentes en endpoints LLM', async ({ request }) => {
    const r = await request.post('/api/voz/parse', {
      data: { texto: 'test' },
      failOnStatusCode: false,
    })
    const headers = r.headers()
    // Estos headers se setean siempre, ok o 429
    expect(headers['x-ratelimit-limit']).toBeDefined()
    expect(headers['x-ratelimit-remaining']).toBeDefined()
  })

  test('/api/health responde y reporta DB ok', async ({ request }) => {
    const r = await request.get('/api/health')
    expect(r.ok()).toBeTruthy()
    const body = await r.json()
    expect(body.status).toBe('ok')
    expect(body.checks?.db).toBe('ok')
  })

  test('Cron expirar-solicitudes sin token → 401', async ({ request }) => {
    const r = await request.post('/api/cron/expirar-solicitudes', {
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(401)
  })
})
