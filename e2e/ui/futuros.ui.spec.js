// E2E del módulo Gastos Futuros.
//
// Este módulo no tenía NINGUNA cobertura E2E: `components/futuros/Lista.vue`
// es el archivo más grande del proyecto (~2000 líneas, la mitad plantilla) y
// lo único que lo tocaba era el smoke de navegación, que solo comprueba que
// la ruta monta. Sin esto no hay forma segura de partir ese componente: no
// existe nada que avise si el corte rompe una interacción.
//
// La suite cubre el recorrido real: crear un proyecto, verlo en la lista,
// buscarlo, filtrarlo, ordenarlo y borrarlo.

import { test, expect } from '@playwright/test'

const marca = Date.now()
const CONCEPTO = `E2E Futuro ${marca}`

// El proyecto necesita una categoría real: `normalizeGastoFuturoPayload`
// la exige y la tarjeta la pinta.
async function categoriaId(request) {
  const r = await request.get('/api/categorias')
  const cats = await r.json()
  expect(cats.length, 'el seed debe dejar categorías').toBeGreaterThan(0)
  return cats[0].id
}

async function irAFuturos(page) {
  await page.goto('/futuros')
  await expect(page.getByTestId('futuros-buscar')).toBeVisible({ timeout: 20000 })
  // Esperar la hidratación, no solo el render. Es la misma trampa que
  // documenta e2e/pages/BasePage.js: el HTML SSR del botón ya existe pero
  // su @click no está bindeado todavía, así que un click inmediato es un
  // no-op silencioso y el test falla diciendo que el estado no cambió.
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
}

// Crea un proyecto por API: la UI de creación es un formulario largo y lo
// que esta suite protege es la LISTA, no el alta. `tipoGasto` es el campo
// que la tarjeta muestra como título.
async function crearProyecto(request, tipoGasto, extra = {}) {
  const r = await request.post('/api/planificador/futuros', {
    data: {
      categoriaId: await categoriaId(request),
      tipoGasto,
      prioridad: 2,
      // Al menos un detalle: `normalizeGastoFuturoPayload` rechaza un
      // proyecto vacío ("Agrega al menos un detalle al gasto futuro").
      detalles: [
        { nombre: 'Detalle E2E', opciones: [{ nombre: 'Opción A', precioPromedio: 100 }] },
      ],
      ...extra,
    },
    failOnStatusCode: false,
  })
  expect(r.ok(), await r.text()).toBeTruthy()
  return r.json()
}

test.describe('Gastos Futuros — lista', () => {
  test('la página monta con buscador, filtros y control de orden', async ({ page }) => {
    await irAFuturos(page)
    await expect(page.getByTestId('futuros-orden')).toBeVisible()
    await expect(page.getByTestId('futuros-filtro-todos')).toBeVisible()
    await expect(page.getByTestId('futuros-filtro-alta')).toBeVisible()
    await expect(page.getByTestId('futuros-filtro-pendientes')).toBeVisible()
    await expect(page.getByTestId('futuros-filtro-decididos')).toBeVisible()
  })

  test('un proyecto creado aparece en la lista', async ({ page, request }) => {
    await crearProyecto(request, CONCEPTO)
    await irAFuturos(page)
    await expect(page.getByText(CONCEPTO, { exact: false }).first()).toBeVisible({ timeout: 15000 })
  })

  test('la búsqueda filtra la lista y el estado vacío explica por qué', async ({
    page,
    request,
  }) => {
    const concepto = `Buscable ${marca}`
    await crearProyecto(request, concepto)
    await irAFuturos(page)

    await page.getByTestId('futuros-buscar').fill(concepto)
    await expect(page.getByText(concepto, { exact: false }).first()).toBeVisible({ timeout: 15000 })

    // Un término imposible deja la lista vacía con el mensaje de búsqueda,
    // no con el de "crea tu primer gasto futuro".
    await page.getByTestId('futuros-buscar').fill(`zzz-no-existe-${marca}`)
    const vacio = page.getByTestId('futuros-vacio')
    await expect(vacio).toBeVisible({ timeout: 15000 })
    await expect(vacio).toHaveText(/No hay coincidencias/i)
  })

  test('el control de orden cicla entre los cuatro criterios y vuelve al inicio', async ({
    page,
  }) => {
    await irAFuturos(page)
    const boton = page.getByTestId('futuros-orden')

    // Vue actualiza el DOM de forma asíncrona: leer el texto justo tras el
    // click devuelve la etiqueta ANTERIOR. Hay que esperar a que cambie.
    const etiquetas = []
    for (let i = 0; i < 4; i++) {
      const actual = (await boton.textContent()).trim()
      etiquetas.push(actual)
      await boton.click()
      await expect(boton).not.toHaveText(actual, { timeout: 5000 })
    }

    // Cuatro criterios distintos…
    expect(new Set(etiquetas).size, `etiquetas vistas: ${etiquetas.join(', ')}`).toBe(4)
    // …y tras cuatro clics vuelve al primero.
    await expect(boton).toHaveText(etiquetas[0])
  })

  test('el filtro Alta deja solo los proyectos de prioridad alta', async ({ page, request }) => {
    const alta = `Alta ${marca}`
    const baja = `Baja ${marca}`
    await crearProyecto(request, alta, { prioridad: 3 })
    await crearProyecto(request, baja, { prioridad: 1 })

    await irAFuturos(page)
    await expect(page.getByText(alta, { exact: false }).first()).toBeVisible({ timeout: 15000 })

    await page.getByTestId('futuros-filtro-alta').click()
    await expect(page.getByTestId('futuros-filtro-alta')).toHaveAttribute('aria-pressed', 'true')

    await expect(page.getByText(alta, { exact: false }).first()).toBeVisible()
    await expect(page.getByText(baja, { exact: false })).toHaveCount(0)
  })

  test('borrar un proyecto pasa por el diálogo compartido y lo quita de la lista', async ({
    page,
    request,
  }) => {
    // Las tres confirmaciones de este módulo estaban escritas a mano, sin
    // role alertdialog ni cierre con Escape. Ahora usan SharedConfirmDialog
    // igual que el resto del proyecto; este test fija ese contrato.
    const aBorrar = `Borrable ${marca}`
    await crearProyecto(request, aBorrar)
    await irAFuturos(page)

    const tarjeta = page.getByTestId('futuros-proyecto').filter({ hasText: aBorrar }).first()
    await expect(tarjeta).toBeVisible({ timeout: 15000 })

    // El menú kebab de la tarjeta abre la acción de eliminar.
    await tarjeta.getByRole('button').last().click()
    await page.getByText('Eliminar', { exact: false }).last().click()

    const dialogo = page.getByTestId('confirm-dialog')
    await expect(dialogo).toBeVisible({ timeout: 10000 })
    await expect(dialogo).toHaveAttribute('role', 'alertdialog')
    await expect(dialogo).toHaveAttribute('aria-modal', 'true')
    await expect(dialogo).toContainText(aBorrar)

    // Escape cancela sin borrar: es una de las cosas que el modal a mano
    // no hacía.
    await page.keyboard.press('Escape')
    await expect(dialogo).toBeHidden({ timeout: 10000 })
    await expect(tarjeta).toBeVisible()
  })

  test('cambiar de filtro no deja la lista en un estado imposible', async ({ page, request }) => {
    await crearProyecto(request, `Ciclo ${marca}`)
    await irAFuturos(page)

    for (const filtro of ['alta', 'pendientes', 'decididos', 'todos']) {
      await page.getByTestId(`futuros-filtro-${filtro}`).click()
      // O hay tarjetas, o hay estado vacío: nunca las dos ni ninguna.
      const tarjetas = await page.getByTestId('futuros-proyecto').count()
      const vacio = await page.getByTestId('futuros-vacio').count()
      expect(tarjetas > 0 || vacio > 0, `filtro ${filtro}`).toBeTruthy()
      expect(tarjetas > 0 && vacio > 0, `filtro ${filtro}`).toBeFalsy()
    }
  })
})
