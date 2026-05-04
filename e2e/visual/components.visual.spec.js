// Snapshots visuales de componentes/modales criticos abiertos en estado vacio.

import { test, expect } from '../fixtures/index.js'
import { RegistroPage } from '../pages/RegistroPage.js'
import { DeudasPage } from '../pages/DeudasPage.js'
import { masksGenericos, esperarEstable, SCREENSHOT_OPTS } from '../helpers/visual.js'

test.describe('Visual — componentes', () => {
  test('snapshot del bottom-sheet FormGastoManual vacio', async ({ page }) => {
    const registro = new RegistroPage(page)
    await registro.goto()

    const modal = await registro.abrirFormManual()
    await esperarEstable(page)

    await expect(modal.root).toHaveScreenshot('form-gasto-manual.png', {
      ...SCREENSHOT_OPTS,
      mask: masksGenericos(page),
    })
  })

  test('snapshot del bottom-sheet FormDeuda vacio', async ({ page }) => {
    const deudas = new DeudasPage(page)
    await deudas.goto()

    const modal = await deudas.abrirNuevaDeuda()
    await esperarEstable(page)

    await expect(modal.root).toHaveScreenshot('form-deuda.png', {
      ...SCREENSHOT_OPTS,
      mask: masksGenericos(page),
    })
  })
})
