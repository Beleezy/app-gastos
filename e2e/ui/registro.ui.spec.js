// E2E UI del modulo Registro: navegacion, formulario manual, historial,
// edicion, eliminacion y filtros.

import { test, expect } from '../fixtures/index.js'
import { RegistroPage } from '../pages/RegistroPage.js'
import { uniqueSuffix, primeraCategoriaId, fechaHoyLima } from '../helpers/db.js'
import { NAV } from '../helpers/selectors.js'

test.describe('Registro — UI', () => {
  test.describe('Smoke', () => {
    test('la pagina /registro carga con BottomNav y pestañas visibles', async ({ page, viewport }) => {
      const registro = new RegistroPage(page)
      await registro.goto()

      // El BottomNav (nav-tab-*) tiene `lg:hidden` — en desktop el SideNav
      // lo reemplaza y los nav-tab-X no se renderizan visibles.
      if (!viewport || viewport.width < 1024) {
        await expect(page.getByTestId(NAV.TAB_REGISTRO)).toBeVisible()
      }
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
      // categoria es obligatoria — sin ella btn-guardar queda disabled.
      await modal.crearGasto({
        concepto,
        monto: 7.5,
        categoria: 'Alimentacion',
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

      // Y verificamos que aparece en el historial visible — el historial
      // puede tener muchos items de tests previos cuyo cleanup no corrio,
      // asi que scrolleamos al item antes de verificar.
      const item = registro.itemPorConcepto(concepto)
      await item.scrollIntoViewIfNeeded({ timeout: 10_000 })
      await expect(item).toBeVisible({ timeout: 10_000 })
    })
  })

  test.describe('FormGastoManual — validacion', () => {
    // El form usa validacion preventiva: btn-guardar mantiene el atributo
    // `disabled` mientras `formularioValido` sea false (concepto >= 2 chars,
    // monto > 0, categoria seleccionada). Por eso un click sobre el boton
    // disabled se queda esperando indefinidamente — verificamos el estado
    // disabled directamente.

    test('submit sin concepto no cierra el modal (rechaza)', async ({ page }) => {
      const registro = new RegistroPage(page)
      await registro.goto()
      const modal = await registro.abrirFormManual()

      await modal.inputMonto().fill('10')

      // Concepto vacio -> btn-guardar disabled -> modal sigue visible
      await expect(modal.btnGuardar()).toBeDisabled()
      await expect(modal.root).toBeVisible()
    })

    test('submit con monto cero no crea el gasto', async ({ page }) => {
      const registro = new RegistroPage(page)
      await registro.goto()
      const modal = await registro.abrirFormManual()

      await modal.inputConcepto().fill('Algo')
      await modal.inputMonto().fill('0')

      // Monto cero -> btn-guardar disabled -> el gasto no se crea
      await expect(modal.btnGuardar()).toBeDisabled()
      await expect(modal.root).toBeVisible()
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
          // Lima time porque useGastos.fechaSeleccionada usa fechaHoy() (PE)
          // y el historial filtra por esa fecha; con UTC el gasto no aparece
          // cuando UTC ya cruzo medianoche pero PE aun no.
          fecha: fechaHoyLima(),
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
