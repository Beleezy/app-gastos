// E2E del módulo Planificador.

import { test, expect } from '@playwright/test'
import { getPrimeraCategoria } from '../fixtures.js'

test.describe('Planificador', () => {
  test('API: crear/actualizar plan mensual', async ({ request }) => {
    const base = await request.get('/api/planificador?mes=4&anio=2026')
    expect(base.ok()).toBeTruthy()
    const baseJson = await base.json()
    expect(baseJson.plan?.id).toBeDefined()

    const r = await request.put('/api/planificador', {
      data: { id: baseJson.plan.id, montoPresupuesto: 1000 },
    })
    expect(r.ok()).toBeTruthy()
    const updated = await r.json()
    expect(Number(updated.montoPresupuesto)).toBe(1000)
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
    const planBase = await request.get('/api/planificador?mes=5&anio=2026')
    expect(planBase.ok()).toBeTruthy()
    const planSeed = await planBase.json()

    const planRes = await request.put('/api/planificador', {
      data: { id: planSeed.plan.id, montoPresupuesto: 1500 },
    })
    expect(planRes.ok()).toBeTruthy()
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

    // Smoke de que la pagina principal cargo (heading H1 siempre presente).
    await expect(page.getByRole('heading', { name: /Planificador/i, level: 1 })).toBeVisible({
      timeout: 10_000,
    })

    // Esperar hidratacion de Vue (sin esto, el HTML del boton ya existe pero
    // el handler @click aun no esta bindeado y el click es no-op).
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})

    // ResumenMes V1 (default) esconde el grupo de acciones (Plantillas/Excel/
    // GCal) detras del toggle "Ver mas". V2 las muestra siempre. Expandimos
    // si el toggle existe y entonces verificamos el boton de plantillas.
    const verMas = page.getByRole('button', { name: 'Ver más', exact: true })
    if ((await verMas.count()) > 0) {
      await verMas.first().click()
    }
    await expect(page.getByTestId('btn-abrir-plantillas')).toBeVisible({ timeout: 10_000 })
  })
})
