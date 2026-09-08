// E2E del módulo Configuraciones.
//
// Los dos tests UI que había aquí comprobaban los paneles "Funciones
// experimentales" y "Notificaciones push". Ambos se retiraron de
// pages/configuraciones.vue (ver el comentario sobre <ConfiguracionesSuperadminPanel>:
// sus funciones pasaron a ser parte del producto por defecto), así que
// llevaban rojos en CI sin cubrir nada. Se sustituyen por las secciones que
// la página renderiza hoy.

import { test, expect } from '@playwright/test'

test.describe('Configuraciones', () => {
  test('UI: /configuraciones carga y muestra sus secciones', async ({ page }) => {
    const r = await page.goto('/configuraciones')
    expect(r.status()).toBeLessThan(500)
    await expect(page.getByText(/Perfil y región/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Apariencia/i).first()).toBeVisible()
    await expect(page.getByText(/Registro y categorías/i).first()).toBeVisible()
    await expect(page.getByText(/Integraciones/i).first()).toBeVisible()
    await expect(page.getByText(/Avanzado/i).first()).toBeVisible()
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
