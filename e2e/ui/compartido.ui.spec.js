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

// ── Vista del receptor ──────────────────────────────────────────────────
// Es el camino que da sentido al módulo y el que más piezas mueve: tarjeta
// de conexión, barra de presupuesto, proyección, detalle y feed de avisos.
// Necesita dos cuentas, así que monta su propio contexto en vez de usar el
// usuario único de playwright.config.
const TOKEN = process.env.DEV_AUTH_TOKEN || 'dev-token'
const ONBOARDING_LISTO = {
  cookies: [],
  origins: [
    {
      origin: 'http://localhost:3000',
      localStorage: [
        {
          name: 'onboarding.v1',
          value: JSON.stringify({ tourCompletado: true, tourSaltado: true, hintsVistos: [] }),
        },
      ],
    },
  ],
}

test.describe('Compartido — lo que ve el receptor', () => {
  // Sus propias esperas suman 70 s (20 + 15 + 15 + 20), por encima del tope
  // global de 60 s de playwright.config: en cuanto un runner lento las agota
  // de verdad, el test no puede terminar aunque todo funcione. Además monta
  // dos cuentas, presupuesto y gastos antes de empezar. El tope va por
  // encima de esa suma, no "por si acaso".
  test.setTimeout(150_000)

  test('ve el rubro con su presupuesto, la proyección y el detalle', async ({
    browser,
    baseURL,
  }) => {
    const marca = Date.now()
    const uid = (rol) => `00000000-0000-0000-0000-${String(marca).slice(-9)}${rol}`
    // Emisor y receptor propios: el usuario por defecto del proyecto tiene una
    // cuota de 5 invitaciones por hora que comparte con los demás specs.
    const emisor = {
      'x-dev-auth-token': TOKEN,
      'x-dev-user-id': uid('881'),
      'x-dev-user-email': `emisor.${marca}@test.local`,
    }
    const receptor = {
      'x-dev-auth-token': TOKEN,
      'x-dev-user-id': uid('882'),
      'x-dev-user-email': `receptor.${marca}@test.local`,
    }

    const ctxEmisor = await browser.newContext({ baseURL, extraHTTPHeaders: emisor })
    const ctxReceptor = await browser.newContext({
      baseURL,
      extraHTTPHeaders: receptor,
      storageState: ONBOARDING_LISTO,
    })

    try {
      const api = ctxEmisor.request
      // Las categorías predefinidas son globales (usuario_id NULL), así que un
      // usuario recién creado ya las tiene.
      const cats = await (await api.get('/api/categorias')).json()
      test.skip(!cats.length, 'Sin categorías sembradas')
      const rubro = cats[0]

      const PRESUPUESTO = 600
      await api.post('/api/presupuestos-categoria', {
        data: { categoriaId: rubro.id, montoMensual: PRESUPUESTO, alertaUmbral: 80 },
      })

      const hoy = new Date()
      const dia = (d) =>
        `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const conceptos = [`Mercado ${marca}`, `Almuerzos ${marca}`]
      for (const [i, concepto] of conceptos.entries()) {
        const r = await api.post('/api/gastos', {
          data: { concepto, monto: i === 0 ? 300 : 150, fecha: dia(1 + i), categoriaId: rubro.id },
        })
        expect(r.ok(), await r.text()).toBeTruthy()
      }

      const inv = await api.post('/api/compartido/conexiones', {
        data: {
          email: receptor['x-dev-user-email'],
          nivelDetalle: 'detalle',
          categorias: [{ categoriaId: rubro.id, umbralAviso: 70 }],
        },
      })
      expect(inv.ok(), await inv.text()).toBeTruthy()
      const conexion = await inv.json()

      const acepta = await ctxReceptor.request.post(
        `/api/compartido/conexiones/${conexion.id}/aceptar`,
      )
      expect(acepta.ok(), await acepta.text()).toBeTruthy()

      const page = await ctxReceptor.newPage()
      const errores = []
      page.on('pageerror', (e) => errores.push(String(e).slice(0, 200)))
      page.on('response', (r) => {
        if (r.status() >= 500 && r.url().includes('/api/')) errores.push(`HTTP ${r.status()}`)
      })

      await page.goto('/compartido')
      await new BasePage(page).waitForReady()

      const sincronizar = page.getByTestId('compartido-sincronizar')
      await expect(sincronizar).toBeVisible({ timeout: 20_000 })

      const contenido = page.locator('#contenido-principal')
      await expect(contenido).toContainText(rubro.nombre)
      // 450 de 600 al día 2 del mes: la proyección se dispara y el semáforo
      // avisa. Es el caso que motiva el módulo.
      await expect(contenido).toContainText(/de S\/\s?600/)
      await expect(contenido).toContainText(/A este ritmo cierra en/)
      await expect(contenido).toContainText(/se agota el día/)
      // Nivel detalle: los gastos, uno por uno.
      await expect(contenido).toContainText(conceptos[0])

      // Sincronizar no debe romper la vista ni quedarse mudo.
      await sincronizar.click()
      await expect(
        page.getByText(/Sin novedades|gastos? nuevos?|actualizados/i).first(),
      ).toBeVisible({ timeout: 15_000 })

      // Un aviso enviado tiene que verse en el feed SIN recargar: los
      // endpoints cachean, y antes el aviso no aparecía ni recargando.
      const mensaje = `Ojo con esto ${marca}`
      await page
        .getByRole('button', { name: /Enviar aviso sobre/i })
        .first()
        .click()
      await page.getByTestId('compartido-aviso-mensaje').fill(mensaje)
      await page.getByTestId('compartido-enviar-aviso').click()
      await expect(contenido).toContainText(mensaje, { timeout: 15_000 })

      // Si el emisor pausa, el receptor merece una explicación, no una
      // tarjeta muda ni un toast rojo. Se comprueba por Sincronizar porque es
      // el camino que salta la caché del navegador (la vista se cachea 30s,
      // así que recargar puede seguir mostrando lo anterior un rato).
      await api.put(`/api/compartido/conexiones/${conexion.id}/alcance`, {
        data: { pausada: true },
      })
      await sincronizar.click()
      await expect(contenido).toContainText(/no está compartiendo sus gastos ahora mismo/i, {
        timeout: 20_000,
      })
      await expect(page.getByText(/No se pudo (cargar|sincronizar)/i)).toHaveCount(0)

      expect(errores, errores.join(' | ')).toHaveLength(0)
    } finally {
      await ctxReceptor.close()
      await ctxEmisor.close()
    }
  })
})
