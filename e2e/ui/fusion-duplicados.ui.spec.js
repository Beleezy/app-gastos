// Fusionar personas duplicadas desde Deudas.

import { test, expect } from '../fixtures/index.js'

test.describe('Deudas — fusionar duplicados', () => {
  test('dos nombres casi iguales se fusionan en uno', async ({ page, request }) => {
    // Solo dígitos en el sufijo: el servidor normaliza mayúsculas del nombre
    // ("E2E-ab" pasa a "E2e-ab") y el texto en pantalla no coincidiría.
    const sufijo = String(Date.now() % 10_000_000)
    const nombreA = `Fusion Perez ${sufijo}`
    const nombreB = `Fusión Pérez ${sufijo}`
    const a = await (
      await request.post('/api/deudas/personas', { data: { nombre: nombreA } })
    ).json()
    const b = await (
      await request.post('/api/deudas/personas', { data: { nombre: nombreB } })
    ).json()
    expect(a.id && b.id).toBeTruthy()

    await page.goto('/deudas', { waitUntil: 'networkidle' })
    await page.getByTestId('btn-fusionar-duplicados').click()
    const hoja = page.getByTestId('fusion-duplicados')
    await expect(hoja).toBeVisible()
    const grupo = hoja.getByTestId('fusion-grupo').filter({ hasText: nombreA })
    await expect(grupo).toBeVisible({ timeout: 15000 })
    await expect(grupo).toContainText(nombreB)

    await grupo.getByTestId('fusion-confirmar').click()
    await expect(hoja.getByTestId('fusion-grupo').filter({ hasText: nombreA })).toHaveCount(0, {
      timeout: 15000,
    })

    // La persona origen ya no está en la lista de la API; el destino sí.
    const personas = await (
      await request.get('/api/deudas/personas', { params: { _t: Date.now() } })
    ).json()
    expect(personas.find((p) => p.id === a.id)).toBeTruthy()
    expect(personas.find((p) => p.id === b.id)).toBeUndefined()
  })
})
