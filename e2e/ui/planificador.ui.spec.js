// E2E UI del modulo Planificador.

import { test, expect } from '../fixtures/index.js'
import { PlanificadorPage } from '../pages/PlanificadorPage.js'
import { SHARED } from '../helpers/selectors.js'

test.describe('Planificador — UI', () => {
  test.describe('Smoke', () => {
    test('la pagina /planificador carga con resumen y selector de mes', async ({ page }) => {
      const plan = new PlanificadorPage(page)
      await plan.goto()

      await expect(plan.resumen()).toBeVisible({ timeout: 15_000 })
      await expect(plan.montoPresupuesto()).toBeVisible()
      await expect(page.getByTestId(SHARED.MONTH_SELECTOR)).toBeVisible()
    })

    test('el resumen muestra valores numericos en presupuesto/asignado/saldo', async ({ page }) => {
      const plan = new PlanificadorPage(page)
      await plan.goto()

      // Espera a que se hidrate (el seed sembra montos)
      await expect(plan.montoPresupuesto()).toContainText(/\d/, { timeout: 15_000 })
      await expect(plan.montoAsignado()).toContainText(/\d/)
      await expect(plan.montoSaldo()).toContainText(/\d/)
    })
  })

  test.describe('MonthSelector', () => {
    test('navegar a mes anterior cambia el label', async ({ page }) => {
      const plan = new PlanificadorPage(page)
      await plan.goto()

      const labelInicial = (await plan.mesActualLabel())?.trim() || ''
      await plan.mesAnterior()
      await page.waitForTimeout(500) // estabilizar fetch
      const labelNuevo = (await plan.mesActualLabel())?.trim() || ''

      expect(labelNuevo).not.toBe(labelInicial)
    })
  })
})
