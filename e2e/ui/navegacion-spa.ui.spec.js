// Regresión N3 (ronda 2, 2026-07): la navegación SPA a /calendario,
// /configuraciones e /informacion colgaba el router en producción y mataba
// TODAA la navegación posterior hasta recargar. Este spec navega la matriz
// completa de rutas SIN hard-load (router.push), dos vueltas, y verifica
// que cada vista monta de verdad (h1 propio de la página, no solo la URL).

import { test, expect } from '../fixtures/index.js'
import { BasePage } from '../pages/BasePage.js'

// [ruta, texto esperado en el h1 de la página]
const RUTAS = [
  ['/planificador', 'Planificador'],
  ['/registro', 'Registro'],
  ['/calendario', 'Calendario financiero'],
  ['/deudas', 'Deudas'],
  ['/configuraciones', 'Configuraciones'],
  ['/ingresos', 'Ingresos'],
  ['/informacion', 'Información'],
  ['/futuros', 'futuros'],
  ['/ahorros', 'Ahorros'],
  ['/metricas', 'Métricas'],
  ['/reportes', 'Reportes'],
  ['/categorias', 'Categorías'],
  ['/papelera', 'Papelera'],
  ['/familia', 'Familia'],
  ['/', 'Mis Finanzas'],
]

test.describe('Navegación SPA — todas las rutas montan sin recarga', () => {
  test('router.push a cada ruta monta la vista y no mata la navegación', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/')
    const base = new BasePage(page)
    await base.waitForReady()

    // Detectar recargas de página: la navegación debe ser 100% SPA. Una
    // recarga (p. ej. disparada por el nav-watchdog) significa que alguna
    // vista no montó por sí sola.
    await page.evaluate(() => {
      window.__spaAlive = true
    })

    for (const vuelta of [1, 2]) {
      for (const [ruta, marker] of RUTAS) {
        await page.evaluate((r) => window.useNuxtApp().$router.push(r), ruta)
        await expect(page, `vuelta ${vuelta}: URL debe cambiar a ${ruta}`).toHaveURL(
          new RegExp(`${ruta === '/' ? '/$' : ruta}`),
        )
        await expect(
          page.locator('h1').first(),
          `vuelta ${vuelta}: la vista de ${ruta} debe montar (h1 "${marker}")`,
        ).toContainText(marker, { timeout: 10_000 })
      }
    }

    const sigueSPA = await page.evaluate(() => window.__spaAlive === true)
    expect(sigueSPA, 'no debe haber ocurrido ninguna recarga completa durante el recorrido').toBe(
      true,
    )
  })
})
