// La app tiene que caber en 370 px de ancho, que es el borde bajo de los
// móviles que usa la gente (el objetivo declarado son 370–412 px).
//
// Cuatro comprobaciones, porque fallan de formas distintas y cada una es
// invisible para las demás:
//
//  1. Desborde horizontal de la página. Es el fallo duro: aparece una barra
//     lateral y el contenido se va fuera de la pantalla.
//  2. Controles que no caben en su fila. Este NO produce desborde —flexbox
//     encoge los botones y el texto salta a dos líneas— así que la primera
//     comprobación lo daba por bueno. Es lo que pasaba con el selector de
//     mes del gráfico de categorías: «Actual + 3 meses + desplegable» eran
//     cinco controles y los tres meses se partían en dos líneas.
//  3. Filas de filtros que esconden su último chip. Tampoco desbordan —el
//     contenedor se desplaza en horizontal— y por eso pasaban: «Saldados» en
//     /deudas y «Decididos» en /futuros quedaban fuera de pantalla sin nada
//     que lo indicara, así que el filtro simplemente no existía para quien
//     no adivinara que esa fila se arrastra.
//  4. Objetivos táctiles por debajo de 44 px. Se mide el área REAL con
//     elementFromPoint, no la caja: la utilidad `.tap-target` del proyecto
//     extiende la zona sensible con un pseudoelemento sin tocar el diseño,
//     así que medir el rect da por pequeño lo que se toca perfectamente.
//
// La segunda mide líneas de texto, no píxeles: un botón cuya etiqueta cabe
// en una línea en 412 px y se parte en 370 px es exactamente el síntoma.

import { test, expect } from '@playwright/test'
import { crearGastoPlanificado, cleanupGastosPlanificados } from '../helpers/db.js'

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

// Nada interactivo puede quedar fuera de pantalla por la derecha. Un
// contenedor que se desplaza en horizontal esconde sus últimos hijos sin
// desbordar la página, y a 370 px eso se lee como un fallo de dibujo, no
// como un carrusel: nadie arrastra una fila a la que solo le sobran 30 px.
const CONTROLES_FUERA_DE_PANTALLA = (ancho) => {
  const fuera = []
  for (const el of document.querySelectorAll('button, a[href], [role="tab"]')) {
    const s = getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') continue
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    if (s.position === 'fixed') continue
    if (r.right > ancho + 1 || r.left < -1) {
      const txt = (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 30)
      fuera.push(`«${txt}» ${Math.round(r.left)}..${Math.round(r.right)}`)
    }
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

    const fuera = await page.evaluate(CONTROLES_FUERA_DE_PANTALLA, ANCHO)
    expect(fuera, `${ruta}: controles fuera de pantalla`).toEqual([])
  })
}

// Área táctil REAL de un control: hasta dónde, alrededor de su centro, un
// toque sigue activándolo. No es su caja — `.tap-target` (main.css) monta un
// ::after de 44×44 que amplía la zona sensible sin cambiar el diseño, y
// elementFromPoint devuelve al dueño del pseudoelemento. Medir el rect daba
// por pequeños controles que se tocan bien y escondía los que no.
const ALTO_TACTIL = (minimo) => {
  const alto = []
  const alcanza = (el, x, y) => {
    if (x < 1 || y < 1 || x > innerWidth - 1 || y > innerHeight - 1) return false
    const hit = document.elementFromPoint(x, y)
    return !!hit && (hit === el || el.contains(hit) || hit.contains(el))
  }
  for (const el of document.querySelectorAll('button, a[href], [role="tab"], [role="switch"]')) {
    const s = getComputedStyle(el)
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') continue
    if (s.pointerEvents === 'none') continue
    if (el.tagName === 'A' && el.closest('p, li')) continue // enlace dentro de un texto
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    if (r.top < 0 || r.bottom > innerHeight) continue // no cabe entero: no medible
    const cx = Math.round(r.left + r.width / 2)
    const cy = Math.round(r.top + r.height / 2)
    if (!alcanza(el, cx, cy)) continue // tapado por un overlay o colapsado
    let arriba = 0
    while (arriba < minimo && alcanza(el, cx, cy - arriba - 1)) arriba++
    let abajo = 0
    while (abajo < minimo && alcanza(el, cx, cy + abajo + 1)) abajo++
    const total = 1 + arriba + abajo
    if (total < minimo) {
      const txt = (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 28)
      alto.push(`«${txt}» ${total}px`)
    }
  }
  return [...new Set(alto)]
}

// 44 px es el mínimo de WCAG y el que declara el proyecto. Se tolera 42
// porque la medición pierde hasta dos píxeles por redondeo cuando el centro
// del control cae entre píxeles: `.tap-target` da exactamente 44 y se leía 41.
const MIN_TACTIL = 42

for (const ruta of ['/', '/registro', '/planificador', '/deudas', '/futuros']) {
  test(`${ruta}: los controles se pueden tocar`, async ({ page }) => {
    await page.goto(ruta, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const pequenos = await page.evaluate(ALTO_TACTIL, MIN_TACTIL)
    expect(pequenos, `${ruta}: controles con menos de ${MIN_TACTIL}px de alto táctil`).toEqual([])
  })
}

test('el total gastado no se dibuja encima de su presupuesto', async ({ page }) => {
  // Con siete cifras el importe no cabía junto a la columna de la derecha y,
  // como no tiene por dónde partirse ni se recorta, se pintaba ENCIMA: dos
  // números superpuestos. No desborda nada, así que solo se ve comparando
  // las cajas de los dos.
  await page.goto('/registro', { waitUntil: 'networkidle' })
  const resumen = page.getByTestId('resumen-mes-registro')
  await expect(resumen).toBeVisible({ timeout: 20000 })
  const solapan = await resumen.evaluate((raiz) => {
    const monto = raiz.querySelector('[data-testid="resumen-mes-total"]')
    const meta = raiz.querySelector('[data-testid="resumen-mes-meta"]')
    if (!monto || !meta) return 'faltan los marcadores del resumen'
    const a = monto.getBoundingClientRect()
    const b = meta.getBoundingClientRect()
    const cruce = Math.min(a.right, b.right) - Math.max(a.left, b.left)
    return cruce > 1 ? `se cruzan ${Math.round(cruce)}px` : null
  })
  expect(solapan, 'el total y el presupuesto se superponen').toBeNull()
})

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
//
// `preparar` existe porque no todos los disparadores están siempre en
// pantalla: el de borrar un planificado cuelga de una fila, y en una base
// recién sembrada el mes en curso no tiene ninguna. Sin eso el test no
// fallaba: no encontraba el botón.
const OVERLAYS = [
  { ruta: '/registro', testid: 'btn-registro-manual', nombre: 'formulario de gasto manual' },
  { ruta: '/deudas', testid: 'btn-fusionar-duplicados', nombre: 'hoja de fusionar duplicados' },
  {
    ruta: '/planificador',
    testid: 'btn-eliminar-planificado',
    nombre: 'confirmación de borrado',
    preparar: (request) => crearGastoPlanificado(request, 'Ancho 370'),
  },
]

const creadosParaOverlays = []

test.afterAll(async ({ request }) => {
  await cleanupGastosPlanificados(request, creadosParaOverlays.splice(0))
})

for (const { ruta, testid, nombre, preparar } of OVERLAYS) {
  test(`${nombre} cabe en ${ANCHO} px`, async ({ page, request }) => {
    const creado = preparar ? await preparar(request) : null
    if (preparar) test.skip(!creado, `No se pudo preparar ${nombre}`)
    if (creado) creadosParaOverlays.push(creado)

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
