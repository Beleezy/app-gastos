// Visual regression de paginas principales con seed cargado.
// Mantiene un baseline por viewport (mobile/desktop). Cuando reestructuren UI,
// actualizar con: npx playwright test --project=visual --update-snapshots
//
// (a) Screenshots: detectan cambios pixel-a-pixel con tolerancia 2%.
// (b) Estructural: assertions de elementos clave (en este mismo spec).
// (c) Responsive: el proyecto visual corre en mobile (Pixel 5).

import { test, expect } from '../fixtures/index.js'
import { BasePage } from '../pages/BasePage.js'
import { masksGenericos, esperarEstable, SCREENSHOT_OPTS } from '../helpers/visual.js'
import { NAV } from '../helpers/selectors.js'

test.describe('Visual — paginas principales', () => {
  test('snapshot /registro', async ({ page }) => {
    await page.goto('/registro')
    const base = new BasePage(page)
    await base.waitForReady()
    await esperarEstable(page)

    await expect(page).toHaveScreenshot('registro.png', {
      ...SCREENSHOT_OPTS,
      mask: masksGenericos(page),
      fullPage: false,
    })
  })

  test('snapshot /planificador', async ({ page }) => {
    await page.goto('/planificador')
    const base = new BasePage(page)
    await base.waitForReady()
    await esperarEstable(page)

    await expect(page).toHaveScreenshot('planificador.png', {
      ...SCREENSHOT_OPTS,
      mask: masksGenericos(page),
      fullPage: false,
    })
  })

  test('snapshot /deudas', async ({ page }) => {
    await page.goto('/deudas')
    const base = new BasePage(page)
    await base.waitForReady()
    await esperarEstable(page)

    await expect(page).toHaveScreenshot('deudas.png', {
      ...SCREENSHOT_OPTS,
      mask: masksGenericos(page),
      fullPage: false,
    })
  })

  test('estructural: BottomNav siempre visible en paginas top-level', async ({ page }) => {
    for (const ruta of ['/registro', '/planificador', '/deudas']) {
      await page.goto(ruta)
      const base = new BasePage(page)
      await base.waitForReady()
      await expect(page.getByTestId(NAV.TAB_REGISTRO)).toBeVisible()
      await expect(page.getByTestId(NAV.TAB_PLANIFICADOR)).toBeVisible()
      await expect(page.getByTestId(NAV.TAB_DEUDAS)).toBeVisible()
    }
  })

  test('responsive: no hay overflow horizontal en mobile', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 })
    await page.goto('/registro')
    const base = new BasePage(page)
    await base.waitForReady()

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(360 + 2) // +2px tolerancia
  })
})
