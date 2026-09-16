// La app tiene que caber en 370 px de ancho, que es el borde bajo de los
// móviles que usa la gente (el objetivo declarado son 360–412 px).
//
// Dos comprobaciones, porque fallan de formas distintas:
//
//  1. Desborde horizontal de la página. Es el fallo duro: aparece una barra
//     lateral y el contenido se va fuera de la pantalla.
//  2. Controles que no caben en su fila. Este NO produce desborde —flexbox
//     encoge los botones y el texto salta a dos líneas— así que la primera
//     comprobación lo daba por bueno. Es lo que pasaba con el selector de
//     mes del gráfico de categorías: «Actual + 3 meses + desplegable» eran
//     cinco controles y los tres meses se partían en dos líneas.
//
// La segunda mide líneas de texto, no píxeles: un botón cuya etiqueta cabe
// en una línea en 412 px y se parte en 370 px es exactamente el síntoma.

import { test, expect } from '@playwright/test'

const ANCHO = 370

test.use({ viewport: { width: ANCHO, height: 800 } })

const RUTAS = [
  '/',
  '/registro',
  '/planificador',
  '/deudas',
  '/ahorros',
  '/ingresos',
  '/futuros',
  '/compartido',
  '/calendario',
  '/metricas',
  '/reportes',
  '/papelera',
  '/familia',
  '/categorias',
  '/configuraciones',
]

// Botones cuyo texto corto se parte en varias líneas. Se cuentan las líneas
// reales con un Range sobre el contenido: medir alto/line-height daba
// falsos positivos con los emoji, que dibujan una caja más alta que el
// texto y hacían parecer partido lo que estaba en una sola línea.
const CONTROLES_PARTIDOS = () => {
  const fuera = []
  const lineas = (el) => {
    const r = document.createRange()
    r.selectNodeContents(el)
    const tops = new Set()
    for (const caja of r.getClientRects()) {
      if (caja.width < 1 || caja.height < 1) continue
      tops.add(Math.round(caja.top))
    }
    return tops.size
  }
  for (const el of document.querySelectorAll('button, a[href], select')) {
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    const s = getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden') continue
    const txt = (el.innerText || '').trim()
    // Solo etiquetas cortas: una frase larga puede ocupar varias líneas
    // con toda la razón.
    if (!txt || txt.length > 22 || txt.split(/\s+/).length > 2) continue
    // Con hijos de bloque (icono encima de la etiqueta, como la barra
    // inferior) las líneas del Range no significan lo mismo.
    if ([...el.children].some((c) => getComputedStyle(c).display !== 'inline')) continue
    if (lineas(el) >= 2) fuera.push(`«${txt}» (${Math.round(r.width)}px de ancho)`)
  }
  return [...new Set(fuera)]
}

for (const ruta of RUTAS) {
  test(`${ruta} cabe en ${ANCHO} px`, async ({ page }) => {
    await page.goto(ruta, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)

    const { scroll, cliente } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      cliente: document.documentElement.clientWidth,
    }))
    expect(scroll, `${ruta} desborda a lo ancho`).toBeLessThanOrEqual(cliente)

    const partidos = await page.evaluate(CONTROLES_PARTIDOS)
    expect(partidos, `${ruta}: controles con el texto partido en dos líneas`).toEqual([])
  })
}

test('las pestañas del planificador se ven enteras', async ({ page }) => {
  await page.goto('/planificador', { waitUntil: 'networkidle' })
  // Cuatro secciones; la cuarta («Compartido») se salía del borde y había que
  // desplazar la barra a ciegas para descubrirla.
  for (const nombre of ['Mensual', 'Futuros', 'Ahorros', 'Compartido']) {
    const tab = page.getByRole('link', { name: nombre, exact: true })
    await expect(tab).toBeVisible()
    const caja = await tab.boundingBox()
    expect(caja.x, `la pestaña ${nombre} empieza fuera de pantalla`).toBeGreaterThanOrEqual(-1)
    expect(caja.x + caja.width, `la pestaña ${nombre} se sale por la derecha`).toBeLessThanOrEqual(
      ANCHO + 1,
    )
  }
})

test('el selector de mes del gráfico de categorías cabe en una fila', async ({ page }) => {
  await page.goto('/registro', { waitUntil: 'networkidle' })
  await page.getByTestId('tab-categorias').click()
  await page.waitForTimeout(500)
  const fila = page.getByRole('button', { name: 'Actual', exact: true })
  await expect(fila).toBeVisible({ timeout: 15000 })
  // Dos accesos rápidos, no tres: con tres no cabían junto al desplegable.
  const meses = page.getByRole('button', {
    name: /^(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)( \d{4})?$/,
  })
  expect(await meses.count()).toBeLessThanOrEqual(2)
  // Todos en la misma línea horizontal que «Actual».
  const yActual = (await fila.boundingBox()).y
  for (let i = 0; i < (await meses.count()); i++) {
    const c = await meses.nth(i).boundingBox()
    expect(Math.abs(c.y - yActual), 'un mes bajó a otra línea').toBeLessThan(6)
    expect(c.x + c.width).toBeLessThanOrEqual(ANCHO + 1)
  }
})

// Los formularios y hojas viven fuera del flujo de la página, así que un
// desborde suyo no aparece al medir la ruta: hay que abrirlos.
const OVERLAYS = [
  ['/registro', 'btn-registro-manual', 'formulario de gasto manual'],
  ['/deudas', 'btn-fusionar-duplicados', 'hoja de fusionar duplicados'],
  ['/planificador', 'btn-eliminar-planificado', 'confirmación de borrado'],
]

for (const [ruta, testid, nombre] of OVERLAYS) {
  test(`${nombre} cabe en ${ANCHO} px`, async ({ page }) => {
    await page.goto(ruta, { waitUntil: 'networkidle' })
    const disparador = page.getByTestId(testid).first()
    await expect(disparador).toBeVisible({ timeout: 20000 })
    await disparador.scrollIntoViewIfNeeded()
    await disparador.click()
    await page.waitForTimeout(600)

    const { scroll, cliente } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      cliente: document.documentElement.clientWidth,
    }))
    expect(scroll, `${nombre}: desborda a lo ancho`).toBeLessThanOrEqual(cliente)
    expect(await page.evaluate(CONTROLES_PARTIDOS), `${nombre}: controles partidos`).toEqual([])

    // Nada del overlay se sale por los lados.
    const desbordados = await page.evaluate((ancho) => {
      const malos = []
      for (const el of document.querySelectorAll('[role="dialog"], [role="alertdialog"]')) {
        const r = el.getBoundingClientRect()
        if (r.width < 2) continue
        if (r.left < -1 || r.right > ancho + 1) malos.push(Math.round(r.width))
      }
      return malos
    }, ANCHO)
    expect(desbordados, `${nombre}: el diálogo se sale de la pantalla`).toEqual([])
  })
}
