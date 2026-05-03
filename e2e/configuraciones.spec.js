// E2E del módulo Configuraciones (FeatureFlags + PushNotifications).

import { test, expect } from '@playwright/test'

test.describe('Configuraciones', () => {
  test('UI: /configuraciones carga y muestra paneles nuevos', async ({ page }) => {
    const r = await page.goto('/configuraciones')
    expect(r.status()).toBeLessThan(500)
    await expect(page.getByText(/Funciones experimentales/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /Notificaciones push/i })).toBeVisible()
  })

  test('UI: toggle de feature flag persiste', async ({ page }) => {
    await page.goto('/configuraciones')
    await expect(page.getByText(/Funciones experimentales/i)).toBeVisible()

    const featureSection = page
      .getByRole('heading', { name: /Funciones experimentales/i })
      .locator('xpath=ancestor::section[1]')

    await featureSection.scrollIntoViewIfNeeded()

    // Toggle del primer feature flag dentro del panel de funciones experimentales
    const firstToggle = featureSection.locator('input[type="checkbox"]').first()
    const firstToggleLabel = featureSection.locator('label[aria-label^="Alternar"]').first()

    const before = await firstToggle.isChecked()
    await firstToggleLabel.click({ force: true })

    await page.waitForTimeout(250)
    await page.reload()
    await expect(page.getByText(/Funciones experimentales/i)).toBeVisible()

    const featureSectionAfter = page
      .getByRole('heading', { name: /Funciones experimentales/i })
      .locator('xpath=ancestor::section[1]')
    const after = await featureSectionAfter.locator('input[type="checkbox"]').first().isChecked()
    expect(after).toBe(!before)
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
