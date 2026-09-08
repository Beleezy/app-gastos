// E2E del módulo Configuraciones (paneles vigentes + uso de LLM).
//
// El panel "Funciones experimentales" y las notificaciones push ya no existen
// (ver el comentario en pages/configuraciones.vue y la migración
// 0027_racionalizacion.sql, que dropea `suscripciones_push`). La página se
// verifica ahora contra los acordeones que sí renderiza, y el mecanismo de
// feature flags se cubre en tests/featureFlag.test.js (Vitest) porque ya no
// tiene UI que lo alterne.

import { test, expect } from '@playwright/test'

/** Locator del <summary> de un acordeón de la página. */
function seccion(page, nombre) {
  return page.locator('details > summary').filter({ hasText: nombre })
}

test.describe('Configuraciones', () => {
  test('UI: /configuraciones carga y muestra los paneles vigentes', async ({ page }) => {
    const r = await page.goto('/configuraciones')
    expect(r.status()).toBeLessThan(500)

    // "Perfil y región" abre por defecto (details[open]).
    await expect(seccion(page, 'Perfil y región')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#cfg-nombre')).toBeVisible()
    await expect(page.locator('#cfg-presupuesto')).toBeVisible()
    await expect(page.locator('#cfg-moneda')).toBeVisible()

    // El resto de acordeones existe, colapsado.
    for (const nombre of ['Apariencia', 'Registro y categorías', 'Integraciones', 'Avanzado']) {
      await expect(seccion(page, nombre)).toBeVisible()
    }

    // Apariencia: acento, tamaño de letra y modo daltónico.
    await seccion(page, 'Apariencia').click()
    await expect(page.getByText('Color del tema')).toBeVisible()
    await expect(page.getByText('Tamano de letra')).toBeVisible()
    await expect(page.getByText('Modo daltonico')).toBeVisible()

    // Integraciones: tarjeta de Google Calendar (los recordatorios in-app
    // viven dentro de ella una vez conectada la cuenta). El <label> del
    // card se renderiza siempre, conectado o no — a diferencia del botón.
    await seccion(page, 'Integraciones').click()
    await expect(page.locator('label').filter({ hasText: 'Google Calendar' })).toBeVisible()

    // Avanzado: modo familiar + uso de IA.
    await seccion(page, 'Avanzado').click()
    await expect(
      page.getByRole('heading', { name: /Familia: cómo cambiar de perfil/i }),
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: /Procesamiento por voz y foto/i })).toBeVisible()
  })

  test('API: /api/usuarios/uso-llm responde', async ({ request }) => {
    const r = await request.get('/api/usuarios/uso-llm')
    expect(r.ok()).toBeTruthy()
    const json = await r.json()
    expect(json).toHaveProperty('totalRequests')
    expect(json).toHaveProperty('totalTokens')
    expect(Array.isArray(json.porEndpoint)).toBeTruthy()
  })
})
