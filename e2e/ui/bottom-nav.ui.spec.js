// E2E UI de la navegacion inferior: cada tab navega a su pagina correctamente.

import { test, expect } from '../fixtures/index.js'
import { BasePage } from '../pages/BasePage.js'
import { NAV } from '../helpers/selectors.js'

test.describe('BottomNav — UI', () => {
  // El BottomNav lleva `lg:hidden` (visible solo bajo 1024px). En el project
  // desktop (viewport 1440x900) el SideNav lo reemplaza — el test no aplica.
  test.skip(
    ({ viewport }) => viewport && viewport.width >= 1024,
    'BottomNav solo se muestra en mobile',
  )

  test('los 4 tabs navegan a sus paginas respectivas', async ({ page }) => {
    await page.goto('/registro')

    const base = new BasePage(page)
    await base.waitForReady()

    await expect(page.getByTestId(NAV.TAB_PLANIFICADOR)).toBeVisible()
    await expect(page.getByTestId(NAV.TAB_REGISTRO)).toBeVisible()
    await expect(page.getByTestId(NAV.TAB_DEUDAS)).toBeVisible()

    await base.irA('planificador')
    await expect(page).toHaveURL(/\/planificador/)

    await base.irA('deudas')
    await expect(page).toHaveURL(/\/deudas/)

    await base.irA('registro')
    await expect(page).toHaveURL(/\/registro/)
  })
})
