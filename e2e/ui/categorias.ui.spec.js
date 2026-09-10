// E2E UI de Categorias. Smoke pragmatico: la pagina carga y muestra categorias.

import { test, expect } from '../fixtures/index.js'
import { BasePage } from '../pages/BasePage.js'

test.describe('Categorias — UI', () => {
  test('la pagina /categorias carga y muestra categorias predefinidas', async ({ page }) => {
    await page.goto('/categorias')

    // La pagina NO pinta el listado al montar: primero hace
    // `POST /api/categorias/provision` y despues `GET /api/categorias`, en
    // ese orden. Sin esperar a que las dos terminen, el test corria contra
    // una lista todavia vacia — y fallaba solo en CI, donde el servidor de
    // desarrollo compila cada ruta la primera vez que la piden, asi que esas
    // dos llamadas tardan mucho mas que en local. Falló 25 s despues de
    // arrancar la suite, siendo la primera spec en tocar /categorias.
    await new BasePage(page).waitForReady()

    const heading = page.getByRole('heading', { name: /categor[ií]as?/i }).first()
    await expect(heading).toBeVisible({ timeout: 15_000 })

    // Debe haber al menos una categoria visible (las predefinidas del seed).
    // El timeout es el mismo que el del heading a proposito: los dos esperan
    // lo mismo (que el servidor responda la primera vez), y uno mas corto
    // solo convierte una compilacion lenta en un fallo rojo.
    const seedAlimentacion = page.getByText(/alimentac[ií]on/i).first()
    await expect(seedAlimentacion).toBeVisible({ timeout: 15_000 })
  })
})
