// E2E UI de Categorias. Smoke pragmatico: la pagina carga y muestra categorias.

import { test, expect } from '../fixtures/index.js'

test.describe('Categorias — UI', () => {
  test('la pagina /categorias carga y muestra categorias predefinidas', async ({ page }) => {
    await page.goto('/categorias')

    // Esperar render del listado (categorias predefinidas siempre existen)
    const heading = page.getByRole('heading', { name: /categor[ií]as?/i }).first()
    await expect(heading).toBeVisible({ timeout: 10_000 })

    // Debe haber al menos una categoria visible (las predefinidas)
    // Buscamos por nombres comunes del seed
    const seedComida = page.getByText(/comida/i).first()
    await expect(seedComida).toBeVisible({ timeout: 5000 })
  })
})
