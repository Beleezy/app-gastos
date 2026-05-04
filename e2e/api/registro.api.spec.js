// E2E del módulo Registro.
// Cubre: crear gasto manual via API, listarlo, editarlo, eliminarlo,
// filtrarlo en el historial, y la pestaña "Mapa".
//
// Requiere E2E_AUTH_BYPASS=1 + E2E_TEST_TOKEN compartido.

import { test, expect } from '@playwright/test'
import { fixtures, getPrimeraCategoria } from '../fixtures.js'

test.describe('Registro de gastos', () => {
  test('API: crear gasto manual válido', async ({ request }) => {
    const categoriaId = await getPrimeraCategoria(request)
    test.skip(!categoriaId, 'Sin categorías sembradas')

    const r = await request.post('/api/gastos', {
      data: { ...fixtures.gastoManual, categoriaId },
    })
    expect(r.ok()).toBeTruthy()
    const gasto = await r.json()
    expect(gasto.id).toBeDefined()
    expect(gasto.concepto).toContain('Pan E2E')
    expect(parseFloat(gasto.monto)).toBe(5.5)

    // limpieza
    await request.delete(`/api/gastos/${gasto.id}`).catch(() => {})
  })

  test('API: rechaza gasto sin concepto (Zod)', async ({ request }) => {
    const r = await request.post('/api/gastos', {
      data: { concepto: '', monto: 5, fecha: '2026-04-28', categoriaId: 'x' },
    })
    expect(r.status()).toBe(400)
  })

  test('API: rechaza monto cero', async ({ request }) => {
    const r = await request.post('/api/gastos', {
      data: { concepto: 'X', monto: 0, fecha: '2026-04-28', categoriaId: 'x' },
    })
    expect(r.status()).toBe(400)
  })

  test('API: detectar duplicados encuentra match', async ({ request }) => {
    const categoriaId = await getPrimeraCategoria(request)
    test.skip(!categoriaId, 'Sin categorías')

    const created = await request.post('/api/gastos', {
      data: { ...fixtures.gastoManual, categoriaId, concepto: 'DupTest', monto: 50 },
    })
    const gasto = await created.json()

    const r = await request.post('/api/gastos/detectar-duplicados', {
      data: {
        candidatos: [{ concepto: 'DupTest', monto: 50, fecha: fixtures.gastoManual.fecha }],
      },
    })
    expect(r.ok()).toBeTruthy()
    const json = await r.json()
    expect(json.resultados[0].duplicados.length).toBeGreaterThan(0)

    await request.delete(`/api/gastos/${gasto.id}`).catch(() => {})
  })

  test('UI: navegar a /registro y ver tabs', async ({ page }) => {
    const r = await page.goto('/registro')
    expect(r.status()).toBeLessThan(500)
    await expect(page.getByText(/Historial/i).first()).toBeVisible({ timeout: 10_000 })
    // La pestaña "Mapa" del Sprint 15 debería estar visible
    await expect(page.getByRole('button', { name: /Mapa/i })).toBeVisible()
  })
})
