// E2E UI del flujo critico de pagos de deudas (parcial → pagado).

import { test, expect } from '../fixtures/index.js'
import { DeudasPage } from '../pages/DeudasPage.js'
import { uniqueSuffix } from '../helpers/db.js'

test.describe('Deudas — pagos UI', () => {
  test('pago parcial reduce monto pendiente y deja deuda en estado parcial', async ({ page, request, tracker }) => {
    const sufijo = uniqueSuffix()
    const persona = `Deudor ${sufijo}`
    const concepto = `Pago parcial ${sufijo}`

    // Setup via API
    const created = await request.post('/api/deudas', {
      data: {
        tipoDeuda: 'me_deben',
        personaNombre: persona,
        concepto,
        monto: 100,
        fecha: new Date().toISOString().slice(0, 10),
      },
    })
    expect(created.ok()).toBeTruthy()
    const deuda = await created.json()
    tracker.deudas.push(deuda.id)

    const deudas = new DeudasPage(page)
    await deudas.goto()
    await deudas.abrirPersona(persona)

    const modal = await deudas.pagarDeuda(concepto)
    await modal.registrarPago({ monto: 30, fecha: new Date().toISOString().slice(0, 10) })
    await modal.esperarCerrado()

    // Verifica via API que monto_pendiente bajo a 70 y estado es parcial
    const r = await request.get(`/api/deudas/${deuda.id}`)
    expect(r.ok()).toBeTruthy()
    const actualizada = await r.json()
    expect(parseFloat(actualizada.montoPendiente)).toBe(70)
    expect(actualizada.estado).toBe('parcial')
  })

  test('pago igual al saldo marca la deuda como pagada', async ({ page, request, tracker }) => {
    const sufijo = uniqueSuffix()
    const persona = `Deudor pleno ${sufijo}`
    const concepto = `Pago total ${sufijo}`

    const created = await request.post('/api/deudas', {
      data: {
        tipoDeuda: 'me_deben',
        personaNombre: persona,
        concepto,
        monto: 50,
        fecha: new Date().toISOString().slice(0, 10),
      },
    })
    const deuda = await created.json()
    tracker.deudas.push(deuda.id)

    const deudas = new DeudasPage(page)
    await deudas.goto()
    await deudas.abrirPersona(persona)

    const modal = await deudas.pagarDeuda(concepto)
    await modal.registrarPago({ monto: 50, fecha: new Date().toISOString().slice(0, 10) })
    await modal.esperarCerrado()

    const r = await request.get(`/api/deudas/${deuda.id}`)
    const actualizada = await r.json()
    expect(parseFloat(actualizada.montoPendiente)).toBe(0)
    expect(actualizada.estado).toBe('pagado')
  })

  test('pago mayor al saldo no cierra el modal (rechazado)', async ({ page, request, tracker }) => {
    const sufijo = uniqueSuffix()
    const persona = `Deudor lim ${sufijo}`
    const concepto = `Sobrepasa ${sufijo}`

    const created = await request.post('/api/deudas', {
      data: {
        tipoDeuda: 'me_deben',
        personaNombre: persona,
        concepto,
        monto: 20,
        fecha: new Date().toISOString().slice(0, 10),
      },
    })
    const deuda = await created.json()
    tracker.deudas.push(deuda.id)

    const deudas = new DeudasPage(page)
    await deudas.goto()
    await deudas.abrirPersona(persona)

    const modal = await deudas.pagarDeuda(concepto)
    await modal.registrarPago({ monto: 999, fecha: new Date().toISOString().slice(0, 10) })

    // El modal debe seguir visible (rechazo); damos un margen
    await expect(modal.root).toBeVisible({ timeout: 3000 })
  })
})
