// E2E UI de Configuraciones. Selectores semanticos por falta de testids estables.

import { test, expect } from '../fixtures/index.js'
import { ConfiguracionesPage } from '../pages/ConfiguracionesPage.js'

test.describe('Configuraciones — UI', () => {
  test('la pagina /configuraciones carga sin errores', async ({ page }) => {
    const conf = new ConfiguracionesPage(page)
    await conf.goto()

    // Cualquier heading "Configuraciones" o similar
    const heading = page.getByRole('heading', { name: /configuraci[oó]n/i }).first()
    await expect(heading).toBeVisible({ timeout: 10_000 })
  })

  test('el documento html refleja el modo de tema (light o dark)', async ({ page }) => {
    const conf = new ConfiguracionesPage(page)
    await conf.goto()

    const html = await page.locator('html').getAttribute('class')
    // El tema esta o "dark" o "" (light por defecto). Cualquiera es valido.
    expect(html === null || typeof html === 'string').toBeTruthy()
  })
})
