// E2E UI del módulo Compartido: que la página cargue, explique de qué va y
// que invitar funcione de punta a punta contra la API real.
//
// El usuario E2E es compartido entre specs y acumula estado, así que los
// tests no asumen que empieza sin conexiones: se entra por el FAB, que está
// siempre, y no por el botón de la guía, que es de primer uso.

import { test, expect } from '../fixtures/index.js'
import { BasePage } from '../pages/BasePage.js'

async function abrirTabComparto(page) {
  await page.goto('/compartido')
  await new BasePage(page).waitForReady()
  await page.getByRole('tab', { name: /Lo que comparto/i }).click()
}

test.describe('Compartido — UI', () => {
  test('la página carga con sus dos vistas y promete no exponer la cuenta', async ({ page }) => {
    await abrirTabComparto(page)

    await expect(page.getByRole('tab', { name: /Lo que veo/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Lo que comparto/i })).toBeVisible()

    await page.getByTestId('compartido-fab-invitar').click()
    // La promesa que hace aceptable compartir: ve gastos, no la cuenta.
    await expect(page.getByText(/No verá tu cuenta ni podrá editar nada/i)).toBeVisible()
  })

  test('la guía de primer uso aclara que no es dividir gastos', async ({ page }) => {
    await abrirTabComparto(page)

    // waitFor y no isVisible(): la lista de conexiones se carga con un fetch,
    // así que un chequeo inmediato saltaría el test aunque la guía sí aparezca.
    const guia = page.getByRole('heading', { name: /Cómo funciona/i })
    const esPrimerUso = await guia
      .waitFor({ state: 'visible', timeout: 8_000 })
      .then(() => true)
      .catch(() => false)
    test.skip(
      !esPrimerUso,
      'El usuario E2E ya tiene conexiones: la guía solo se muestra en primer uso',
    )

    // La confusión que el módulo tiene que despejar desde el primer pantallazo.
    await expect(page.getByText(/No es dividir gastos/i)).toBeVisible()
    await expect(page.getByTestId('compartido-guia-empezar')).toBeVisible()
  })

  test('invitar a alguien deja la conexión listada con su alcance', async ({ page }) => {
    await abrirTabComparto(page)
    await page.getByTestId('compartido-fab-invitar').click()

    const email = `ui.compartido.${Date.now()}@test.local`
    await page.getByTestId('compartido-email').fill(email)

    // Sin rubros marcados el texto de ayuda debe decir la verdad: solo se
    // verán los gastos marcados uno por uno.
    await expect(page.getByText(/Sin rubros marcados solo verá los gastos/i)).toBeVisible()

    await page.getByTestId('compartido-enviar-invitacion').click()

    await expect(page.getByText(email)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Esperando que acepte la invitación/i).first()).toBeVisible()
    await expect(page.getByTestId('compartido-editar-alcance').first()).toBeVisible()
  })

  test('el historial de registro cicla la visibilidad de un gasto', async ({ page }) => {
    // El gasto se crea acá, con un concepto único, en vez de tomar el primero
    // del historial: el usuario E2E es compartido entre specs y su primer
    // gasto puede venir ya marcado de otra corrida.
    const concepto = `Visibilidad UI ${Date.now()}`
    const hoy = new Date()
    const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
      hoy.getDate(),
    ).padStart(2, '0')}`

    const cats = await (await page.request.get('/api/categorias')).json()
    test.skip(!cats.length, 'Sin categorías sembradas')

    const creado = await page.request.post('/api/gastos', {
      data: { concepto, monto: 9.9, fecha, categoriaId: cats[0].id },
    })
    expect(creado.ok(), await creado.text()).toBeTruthy()
    const gasto = await creado.json()
    // Nace en 'auto', que es el default y no lleva insignia.
    expect(gasto.visibilidad).toBe('auto')

    try {
      await page.goto('/registro')
      await new BasePage(page).waitForReady()

      const fila = page.getByTestId('gasto-item').filter({ hasText: concepto }).first()
      await expect(fila).toBeVisible({ timeout: 15_000 })
      await expect(fila.getByText(/^(Privado|Compartido)$/)).toHaveCount(0)

      // auto → privado → compartido → auto, con la insignia diciéndolo por
      // texto y no solo por color (el app tiene modo daltónico).
      const boton = fila.getByTestId('btn-visibilidad-gasto')

      await boton.click()
      await expect(fila.getByText('Privado', { exact: true })).toBeVisible({ timeout: 10_000 })

      await boton.click()
      await expect(fila.getByText('Compartido', { exact: true })).toBeVisible({ timeout: 10_000 })

      await boton.click()
      await expect(fila.getByText(/^(Privado|Compartido)$/)).toHaveCount(0, { timeout: 10_000 })
    } finally {
      await page.request.delete(`/api/gastos/${gasto.id}`).catch(() => {})
    }
  })
})
