// E2E UI del modulo Registro: navegacion, formulario manual, historial,
// edicion, eliminacion y filtros.

import { test, expect } from '../fixtures/index.js'
import { RegistroPage } from '../pages/RegistroPage.js'
import { uniqueSuffix, primeraCategoriaId } from '../helpers/db.js'
import { NAV } from '../helpers/selectors.js'

test.describe('Registro — UI', () => {
  test.describe('Smoke', () => {
    test('la pagina /registro carga con BottomNav y pestañas visibles', async ({ page }) => {
      const registro = new RegistroPage(page)
      await registro.goto()

      await expect(page.getByTestId(NAV.TAB_REGISTRO)).toBeVisible()
      await expect(registro.btnMicrofono()).toBeVisible()
      await expect(registro.btnCamara()).toBeVisible()
    })

    test('el FAB de registro manual abre el bottom-sheet con campos esperados', async ({ page }) => {
      const registro = new RegistroPage(page)
      await registro.goto()

      const modal = await registro.abrirFormManual()

      await expect(modal.inputConcepto()).toBeVisible()
      await expect(modal.inputMonto()).toBeVisible()
      await expect(modal.btnGuardar()).toBeVisible()
    })
  })

  test.describe('FormGastoManual — happy path', () => {
    test('crear gasto manual con campos minimos lo añade al historial', async ({ page, request, tracker }) => {
      const sufijo = uniqueSuffix()
      const concepto = `Cafe ${sufijo}`

      const registro = new RegistroPage(page)
      await registro.goto()

      const modal = await registro.abrirFormManual()
      await modal.crearGasto({
        concepto,
        monto: 7.5,
      })
      await modal.esperarCerrado()

      // Verificamos via API porque la UI puede paginar/ocultar el item recien creado
      const r = await request.get('/api/gastos')
      expect(r.ok()).toBeTruthy()
      const data = await r.json()
      const lista = Array.isArray(data) ? data : data?.gastos || []
      const creado = lista.find(g => g.concepto === concepto)
      expect(creado, `debe existir gasto con concepto "${concepto}"`).toBeDefined()
      tracker.gastos.push(creado.id)

      // Y verificamos que aparece en el historial visible (al menos en algun item)
      await expect(registro.itemPorConcepto(concepto)).toBeVisible({ timeout: 10_000 })
    })
  })

  test.describe('FormGastoManual — validacion', () => {
    test('submit sin concepto no cierra el modal (rechaza)', async ({ page }) => {
      const registro = new RegistroPage(page)
      await registro.goto()
      const modal = await registro.abrirFormManual()

      await modal.inputMonto().fill('10')
      await modal.btnGuardar().click()

      // El modal sigue visible (no se cerro porque hubo validacion)
      await expect(modal.root).toBeVisible({ timeout: 2000 })
    })

    test('submit con monto cero no crea el gasto', async ({ page }) => {
      const registro = new RegistroPage(page)
      await registro.goto()
      const modal = await registro.abrirFormManual()

      await modal.inputConcepto().fill('Algo')
      await modal.inputMonto().fill('0')
      await modal.btnGuardar().click()

      await expect(modal.root).toBeVisible({ timeout: 2000 })
    })
  })

  test.describe('Historial — eliminar', () => {
    test('eliminar un gasto recien creado lo quita de la lista', async ({ page, request }) => {
      const sufijo = uniqueSuffix()
      const concepto = `BorrarMe ${sufijo}`

      // Setup: crear via API (mas rapido que via UI)
      const categoriaId = await primeraCategoriaId(request)
      test.skip(!categoriaId, 'no hay categorias sembradas')
      const created = await request.post('/api/gastos', {
        data: {
          concepto,
          monto: 5,
          fecha: new Date().toISOString().slice(0, 10),
          categoriaId,
        },
      })
      expect(created.ok()).toBeTruthy()

      const registro = new RegistroPage(page)
      await registro.goto()

      const item = registro.itemPorConcepto(concepto)
      await expect(item).toBeVisible({ timeout: 10_000 })

      await registro.eliminarGasto(concepto)

      await expect(item).toHaveCount(0, { timeout: 10_000 })
    })
  })
})
