// Utilidades para tests visuales: masking de elementos volatiles que producen
// falsos positivos en snapshot diffs (timestamps, graficos canvas, etc).

/**
 * Devuelve un array de Locators a enmascarar en una pagina dada.
 * Los snapshots toHaveScreenshot aceptan { mask: [...] }.
 */
export function masksGenericos(page) {
  return [
    // Cualquier <time> con fechas relativas
    page.locator('time'),
    // Graficos chart.js / canvas (no deterministicos pixel-perfect)
    page.locator('canvas'),
    // Elementos marcados explicitamente como volatiles
    page.locator('[data-visual-mask]'),
  ]
}

/**
 * Espera animaciones / transiciones para estabilizar antes de un snapshot.
 */
export async function esperarEstable(page) {
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  // Pequena pausa para transiciones CSS de bottom-sheets
  await page.waitForTimeout(300)
}

/**
 * Configuracion estandar para toHaveScreenshot — toleramos hasta 2% de diff
 * para evitar falsos positivos por antialiasing/font rendering.
 */
export const SCREENSHOT_OPTS = {
  maxDiffPixelRatio: 0.02,
  animations: 'disabled',
  caret: 'hide',
}
