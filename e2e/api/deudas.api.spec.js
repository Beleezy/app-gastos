// E2E del módulo Deudas.

import { test, expect } from '@playwright/test'
import { fixtures } from '../fixtures.js'

test.describe('Deudas', () => {
  test('API: crear deuda con personaNombre', async ({ request }) => {
    const r = await request.post('/api/deudas', { data: fixtures.deuda })
    expect(r.ok()).toBeTruthy()
    const deuda = await r.json()
    expect(deuda.id).toBeDefined()
    expect(deuda.personaNombre).toBe('E2E Tester')
    expect(parseFloat(deuda.montoPendiente)).toBe(100)
  })

  test('API: rechaza deuda sin persona', async ({ request }) => {
    const r = await request.post('/api/deudas', {
      data: { tipoDeuda: 'me_deben', concepto: 'X', monto: 50 },
    })
    expect(r.status()).toBe(400)
  })

  test('API: balance global devuelve estructura correcta', async ({ request }) => {
    const r = await request.get('/api/deudas/balance')
    expect(r.ok()).toBeTruthy()
    const balance = await r.json()
    expect(balance).toHaveProperty('totalMeDeben')
    expect(balance).toHaveProperty('totalYoDebo')
    expect(balance).toHaveProperty('balanceNeto')
    expect(Array.isArray(balance.personas)).toBeTruthy()
  })

  test('API: registrar pago reduce monto pendiente', async ({ request }) => {
    const created = await request.post('/api/deudas', {
      data: { ...fixtures.deuda, concepto: 'Para pagar' },
    })
    const deuda = await created.json()

    const pago = await request.post(`/api/deudas/${deuda.id}/pagos`, {
      data: { monto: 30, fechaPago: fixtures.gastoManual?.fecha || '2026-04-28' },
    })
    expect(pago.ok()).toBeTruthy()
    const r = await pago.json()
    expect(parseFloat(r.deuda.montoPendiente)).toBe(70)
    expect(r.deuda.estado).toBe('parcial')
  })

  test('API: pago > saldo devuelve 400', async ({ request }) => {
    const created = await request.post('/api/deudas', {
      data: { ...fixtures.deuda, concepto: 'Sobrepasa', monto: 50 },
    })
    const deuda = await created.json()
    const r = await request.post(`/api/deudas/${deuda.id}/pagos`, {
      data: { monto: 999, fechaPago: '2026-04-28' },
    })
    expect(r.status()).toBe(400)
  })

  test('API: merge-sugerencias devuelve clusters', async ({ request }) => {
    const r = await request.get('/api/deudas/personas/merge-sugerencias')
    expect(r.ok()).toBeTruthy()
    const json = await r.json()
    expect(Array.isArray(json.sugerencias)).toBeTruthy()
  })

  test('UI: /deudas carga y muestra BalanceGlobal', async ({ page }) => {
    const r = await page.goto('/deudas')
    expect(r.status()).toBeLessThan(500)
    await expect(page.getByText(/Deudas y Pagos/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /Balance global/i })).toBeVisible({
      timeout: 10_000,
    })
  })
})
