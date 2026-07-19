// E2E UI del modulo Deudas: smoke, formulario de nueva deuda, tabs.

import { test, expect } from '../fixtures/index.js'
import { DeudasPage } from '../pages/DeudasPage.js'
import { uniqueSuffix } from '../helpers/db.js'
import { DEUDAS } from '../helpers/selectors.js'

test.describe('Deudas — UI', () => {
  test.describe('Smoke', () => {
    test('/deudas carga con tabs Me deben / Yo debo y lista de personas', async ({ page }) => {
      const deudas = new DeudasPage(page)
      await deudas.goto()

      await expect(deudas.tabMeDeben()).toBeVisible({ timeout: 15_000 })
      await expect(deudas.tabYoDebo()).toBeVisible()
      await expect(deudas.listaPersonas()).toBeVisible()
    })

    test('cambiar a tab Yo debo no rompe el layout', async ({ page }) => {
      const deudas = new DeudasPage(page)
      await deudas.goto()

      await deudas.verYoDebo()
      // El tab queda activo (tiene clase distintiva); validamos que la lista
      // sigue siendo visible (puede estar vacia, pero el contenedor existe).
      await expect(deudas.listaPersonas()).toBeVisible()

      await deudas.verMeDeben()
      await expect(deudas.listaPersonas()).toBeVisible()
    })
  })

  test.describe('FormDeuda — happy path', () => {
    test('crear una deuda Me deben aparece en la lista', async ({ page, request, tracker }) => {
      const sufijo = uniqueSuffix()
      const persona = `Persona ${sufijo}`
      const concepto = `Prestamo ${sufijo}`

      const deudas = new DeudasPage(page)
      await deudas.goto()

      const modal = await deudas.abrirNuevaDeuda()
      await modal.crearDeuda({
        tipo: 'me_deben',
        persona,
        concepto,
        monto: 150,
      })
      await modal.esperarCerrado()

      // Verifica via API
      const r = await request.get('/api/deudas')
      expect(r.ok()).toBeTruthy()
      const data = await r.json()
      const lista = Array.isArray(data) ? data : data?.deudas || []
      const creada = lista.find((d) => d.concepto === concepto)
      expect(creada, `debe existir deuda "${concepto}"`).toBeDefined()
      tracker.deudas.push(creada.id)

      // Verifica en UI — el seed crea muchas personas con montos > 150, la
      // nueva persona puede aparecer scrolleada fuera del viewport mobile.
      const personaItem = deudas.personaPorNombre(persona)
      await personaItem.scrollIntoViewIfNeeded({ timeout: 10_000 })
      await expect(personaItem).toBeVisible({ timeout: 10_000 })
    })
  })

  test.describe('FormDeuda — validacion', () => {
    test('submit sin persona ni concepto no cierra el modal', async ({ page }) => {
      const deudas = new DeudasPage(page)
      await deudas.goto()
      const modal = await deudas.abrirNuevaDeuda()

      await modal.inputMonto().fill('50')
      await modal.btnGuardar().click()

      await expect(modal.root).toBeVisible({ timeout: 2000 })
    })
  })
})
