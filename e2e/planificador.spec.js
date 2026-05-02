// E2E del módulo Planificador.

import { test, expect } from '@playwright/test'
import { getPrimeraCategoria } from './fixtures.js'

test.describe('Planificador', () => {
  test('API: crear plan mensual', async ({ request }) => {
    const r = await request.put('/api/planificador', {
      data: { mes: 4, anio: 2026, montoPresupuesto: 1000 },
    })
    // 200 (idempotente sobre UNIQUE) o 201
    expect([200, 201]).toContain(r.status())
  })

  test('API: listar plantillas devuelve array', async ({ request }) => {
    const r = await request.get('/api/planificador/plantillas')
    expect(r.ok()).toBeTruthy()
    const list = await r.json()
    expect(Array.isArray(list)).toBeTruthy()
  })

  test('API: crear y aplicar plantilla', async ({ request }) => {
    const categoriaId = await getPrimeraCategoria(request)
    test.skip(!categoriaId, 'Sin categorías sembradas')

    // Asegura plan
    const planRes = await request.put('/api/planificador', {
      data: { mes: 5, anio: 2026, montoPresupuesto: 1500 },
    })
    const plan = await planRes.json()

    const tplRes = await request.post('/api/planificador/plantillas', {
      data: {
        nombre: 'E2E Tpl',
        montoPresupuesto: 1500,
        gastos: [
          { concepto: 'Alquiler E2E', montoEstimado: 800, categoriaId, diaProbable: 1 },
          { concepto: 'Internet E2E', montoEstimado: 100, categoriaId, diaProbable: 5 },
        ],
      },
    })
    expect(tplRes.ok()).toBeTruthy()
    const tpl = await tplRes.json()
    expect(tpl.gastos.length).toBe(2)

    const apl = await request.post(`/api/planificador/plantillas/${tpl.id}/aplicar`, {
      data: { planMensualId: plan.id || plan.plan?.id },
    })
    expect(apl.ok()).toBeTruthy()
    const r = await apl.json()
    expect(r.creados).toBeGreaterThan(0)

    // Cleanup
    await request.delete(`/api/planificador/plantillas/${tpl.id}`).catch(() => {})
  })

  test('UI: /planificador renderiza y muestra plantillas', async ({ page }) => {
    const r = await page.goto('/planificador')
    expect(r.status()).toBeLessThan(500)
    await expect(page.getByText(/Plantillas de mes/i)).toBeVisible({ timeout: 10_000 })
  })
})
