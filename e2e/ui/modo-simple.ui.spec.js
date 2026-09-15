// Modo simple (configuraciones.modo_simple) a 380 px de ancho.
//
// Usa un usuario propio: activar el modo en el usuario compartido de la
// suite cambiaría la navegación de los demás specs que corren en paralelo.
// Además comprueba que NINGUNA de las dos versiones desborda a 380 px.

import { test, expect } from '@playwright/test'

const TOKEN = process.env.DEV_AUTH_TOKEN || 'dev-token'
const USUARIO = {
  'x-dev-auth-token': TOKEN,
  'x-dev-user-id': '00000000-0000-0000-0000-000000000104',
  'x-dev-user-email': 'simple@test.local',
}

test.use({
  extraHTTPHeaders: USUARIO,
  viewport: { width: 380, height: 780 },
  storageState: {
    cookies: [],
    origins: [
      {
        origin: process.env.BASE_URL || 'http://localhost:3000',
        localStorage: [
          {
            name: 'onboarding.v1',
            value: JSON.stringify({ tourCompletado: true, tourSaltado: true, hintsVistos: [] }),
          },
        ],
      },
    ],
  },
})

async function sinDesborde(page, ruta) {
  await page.goto(ruta, { waitUntil: 'networkidle' })
  const { scroll, cliente } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    cliente: document.documentElement.clientWidth,
  }))
  expect(scroll, `${ruta} desborda: ${scroll} > ${cliente}`).toBeLessThanOrEqual(cliente)
}

test.describe('Modo simple a 380 px', () => {
  test.afterAll(async ({ request }) => {
    await request.put('/api/configuraciones', { data: { modoSimple: false } })
  })

  test('activado: portada de tres botones, sin planificador en la barra y sin desborde', async ({
    page,
    request,
  }) => {
    const r = await request.put('/api/configuraciones', { data: { modoSimple: true } })
    expect(r.ok(), await r.text()).toBeTruthy()
    expect((await r.json()).modoSimple).toBe(true)

    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('dashboard-simple')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('html')).toHaveClass(/modo-simple/)
    await expect(page.getByTestId('simple-anotar')).toBeVisible()
    await expect(page.getByTestId('nav-tab-planificador')).toHaveCount(0)
    await expect(page.getByTestId('nav-tab-registro')).toBeVisible()
    for (const ruta of ['/', '/registro', '/deudas', '/ingresos']) await sinDesborde(page, ruta)

    // En registro no hay pestañas ni filtros: solo el historial.
    await page.goto('/registro', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('tab-stats')).toHaveCount(0)
    await expect(page.getByTestId('historial-diario')).toBeVisible({ timeout: 15000 })

    // El botón grande lleva a registrar.
    await page.goto('/', { waitUntil: 'networkidle' })
    await page.getByTestId('simple-anotar').click()
    await expect(page).toHaveURL(/\/registro/)
  })

  test('desactivado: la versión normal tampoco desborda a 380 px', async ({ page, request }) => {
    await request.put('/api/configuraciones', { data: { modoSimple: false } })
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page.getByTestId('nav-tab-planificador')).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId('dashboard-simple')).toHaveCount(0)
    await expect(page.locator('html')).not.toHaveClass(/modo-simple/)
    for (const ruta of ['/', '/registro', '/deudas', '/planificador', '/ingresos', '/ahorros']) {
      await sinDesborde(page, ruta)
    }
  })
})
