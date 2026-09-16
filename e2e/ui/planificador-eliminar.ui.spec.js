// Cancelar el borrado de un gasto planificado dejaba la página congelada.
//
// Los tres sitios que borran planificados (lista, calendario y gráfico)
// registraban un overlay sobre «hay un gasto elegido» y además renderizaban
// SharedConfirmDialog, que ya gestiona el suyo. Cancelar apagaba el booleano
// del diálogo pero no el gasto elegido, así que el overlay del padre no se
// liberaba y el `position: fixed` que useModalLayer pone en el body se
// quedaba puesto: no se podía volver a hacer scroll ni usar la página.
//
// La prueba mira el síntoma real, no el estado interno: ¿la página vuelve a
// desplazarse después de cancelar?

import { test, expect } from '../fixtures/index.js'

const estadoBody = (page) =>
  page.evaluate(() => ({
    position: getComputedStyle(document.body).position,
    modalOpen: document.documentElement.classList.contains('modal-open'),
  }))

async function haceScroll(page) {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(150)
  await page.mouse.wheel(0, 500)
  await page.waitForTimeout(350)
  return page.evaluate(() => window.scrollY)
}

test.describe('Planificador — cancelar un borrado', () => {
  test('tras cancelar, la página sigue usándose', async ({ page }) => {
    await page.goto('/planificador', { waitUntil: 'networkidle' })

    const borrar = page.getByTestId('btn-eliminar-planificado').first()
    await expect(borrar).toBeVisible({ timeout: 20000 })
    await borrar.scrollIntoViewIfNeeded()
    await borrar.click()

    const dialogo = page.getByTestId('confirm-dialog')
    await expect(dialogo).toBeVisible()
    // Mientras está abierto, el fondo se bloquea a propósito.
    expect((await estadoBody(page)).position).toBe('fixed')

    await page.getByRole('button', { name: /^Cancelar$/ }).click()
    await expect(dialogo).toBeHidden()

    const estado = await estadoBody(page)
    expect(estado.position, 'el body sigue bloqueado tras cancelar').not.toBe('fixed')
    expect(estado.modalOpen, 'la clase modal-open no se quitó').toBe(false)
    expect(await haceScroll(page), 'la página no se desplaza tras cancelar').toBeGreaterThan(0)
  })

  test('abrir y cancelar varias veces no acumula bloqueos', async ({ page }) => {
    await page.goto('/planificador', { waitUntil: 'networkidle' })
    const borrar = page.getByTestId('btn-eliminar-planificado').first()
    await expect(borrar).toBeVisible({ timeout: 20000 })

    for (let i = 0; i < 3; i++) {
      await borrar.scrollIntoViewIfNeeded()
      await borrar.click()
      await expect(page.getByTestId('confirm-dialog')).toBeVisible()
      // Alternar la vía de cierre: botón, backdrop y Escape tienen que dejar
      // el mismo estado (los tres pasan por el mismo setter).
      if (i === 0) await page.getByRole('button', { name: /^Cancelar$/ }).click()
      else if (i === 1) await page.getByTestId('confirm-dialog').press('Escape')
      // Tocar fuera del diálogo (el fondo oscurecido) en la esquina superior.
      else await page.mouse.click(8, 8)
      await expect(page.getByTestId('confirm-dialog')).toBeHidden()
    }

    expect((await estadoBody(page)).position).not.toBe('fixed')
    expect(await haceScroll(page)).toBeGreaterThan(0)
  })
})
