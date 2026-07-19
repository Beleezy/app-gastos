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

    const flagKey = 'predictor_categoria'
    const featureSection = page
      .getByRole('heading', { name: /Funciones experimentales/i })
      .locator('xpath=ancestor::section[1]')

    await featureSection.scrollIntoViewIfNeeded()

    const firstToggle = featureSection.locator('input[type="checkbox"]').first()
    const before = await firstToggle.isChecked()

    await page.evaluate(
      ({ key, value }) => {
        const raw = localStorage.getItem('gastos.featureFlags.v1')
        const parsed = raw ? JSON.parse(raw) : {}
        parsed[key] = value
        localStorage.setItem('gastos.featureFlags.v1', JSON.stringify(parsed))
      },
      { key: flagKey, value: !before },
    )

    await page.reload()
    await expect(page.getByText(/Funciones experimentales/i)).toBeVisible()

    const persisted = await page.evaluate((key) => {
      const raw = localStorage.getItem('gastos.featureFlags.v1')
      if (!raw) return undefined
      return JSON.parse(raw)?.[key]
    }, flagKey)

    expect(persisted).toBe(!before)
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
