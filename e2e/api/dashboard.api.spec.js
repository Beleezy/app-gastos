// E2E de /api/dashboard, /api/ahorros y /api/papelera.
//
// Los tres módulos estaban SIN cobertura E2E. El dashboard es el endpoint
// más golpeado de la app —lo pide el home en cada arranque y agrega diez
// queries en paralelo— y la papelera tiene la lógica más delicada del
// proyecto: restaurar una deuda revive solo lo que cayó en su misma
// cascada de borrado, comparando timestamps.

import { test, expect } from '@playwright/test'

const marca = Date.now()

// Segunda identidad para los tests de aislamiento. El bypass de auth dev
// autoprovisiona al usuario en su primera petición.
const otroUsuario = {
  'x-dev-auth-token': process.env.DEV_AUTH_TOKEN || '',
  'x-dev-user-id': `00000000-0000-0000-0000-${String(marca).slice(-8)}7001`,
  'x-dev-user-email': `vecino.${marca}@test.local`,
}
const hoy = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(Math.min(d.getDate(), 28)).padStart(2, '0')}`
}

async function primeraCategoria(request) {
  const r = await request.get('/api/categorias')
  return (await r.json())[0].id
}

test.describe('Dashboard', () => {
  test('devuelve las seis secciones que consume el home', async ({ request }) => {
    const r = await request.get('/api/dashboard')
    expect(r.ok(), await r.text()).toBeTruthy()
    const d = await r.json()

    // El home lee estas claves sin comprobarlas: si el endpoint deja de
    // devolver una, la página revienta en el render, no aquí.
    for (const clave of ['gastos', 'deudas', 'plan', 'futuros', 'ahorros', 'ingresos']) {
      expect(d, `falta la sección ${clave}`).toHaveProperty(clave)
    }
    expect(typeof d.mes).toBe('number')
    expect(typeof d.anio).toBe('number')
    expect(d.moneda).toBeTruthy()
  })

  test('los importes llegan como número, no como string de Postgres', async ({ request }) => {
    // Las columnas son NUMERIC y el driver las devuelve como string. Si el
    // endpoint deja de convertirlas, el front suma cadenas: "100" + "50"
    // pasa a ser "10050" sin que nada falle.
    const d = await (await request.get('/api/dashboard')).json()
    expect(typeof d.gastos.totalMes).toBe('number')
    expect(typeof d.deudas.totalMeDeben).toBe('number')
    expect(typeof d.deudas.totalYoDebo).toBe('number')
    expect(typeof d.deudas.balanceNeto).toBe('number')
    expect(typeof d.plan.presupuesto).toBe('number')
    expect(typeof d.ahorros.totalMes).toBe('number')
    expect(typeof d.ingresos.totalMes).toBe('number')
    expect(typeof d.ingresos.saldoNeto).toBe('number')
  })

  test('el balance neto de deudas y el saldo neto son coherentes', async ({ request }) => {
    const d = await (await request.get('/api/dashboard')).json()
    expect(d.deudas.balanceNeto).toBeCloseTo(d.deudas.totalMeDeben - d.deudas.totalYoDebo, 2)
    expect(d.ingresos.saldoNeto).toBeCloseTo(d.ingresos.totalMes - d.gastos.totalMes, 2)
  })

  test('el porcentaje del plan no divide por cero sin gastos planeados', async ({ request }) => {
    const d = await (await request.get('/api/dashboard')).json()
    expect(Number.isFinite(d.plan.porcentajePagado)).toBe(true)
    expect(d.plan.porcentajePagado).toBeGreaterThanOrEqual(0)
    expect(d.plan.porcentajePagado).toBeLessThanOrEqual(100)
  })

  test('un gasto nuevo se refleja en el total del mes', async ({ request }) => {
    const antes = (await (await request.get('/api/dashboard')).json()).gastos.totalMes

    const r = await request.post('/api/gastos', {
      data: {
        concepto: `Dashboard ${marca}`,
        monto: 12.34,
        fecha: hoy(),
        categoriaId: await primeraCategoria(request),
      },
      failOnStatusCode: false,
    })
    expect(r.ok(), await r.text()).toBeTruthy()

    // `_v` evita el Cache-Control de 30 s del propio endpoint.
    const despues = (await (await request.get(`/api/dashboard?_v=${Date.now()}`)).json()).gastos
      .totalMes
    expect(despues).toBeCloseTo(antes + 12.34, 2)
  })
})

test.describe('Ahorros', () => {
  test('crear un medio y un ahorro suma en el resumen del mes', async ({ request }) => {
    const medio = await request.post('/api/ahorros/medios', {
      data: { nombre: `Banco ${marca}`, icono: '🏦' },
      failOnStatusCode: false,
    })
    expect(medio.ok(), await medio.text()).toBeTruthy()
    const medioId = (await medio.json()).id

    // `mes`/`anio` NO se mandan: los deriva el servidor de `fecha`. El
    // schema los descarta si vienen, para que el cuerpo no pueda colocar un
    // ahorro en un mes distinto al de su propia fecha.
    const ahorro = await request.post('/api/ahorros', {
      data: { medioAhorroId: medioId, monto: 250, fecha: hoy() },
      failOnStatusCode: false,
    })
    expect(ahorro.ok(), await ahorro.text()).toBeTruthy()

    const dash = await (await request.get(`/api/dashboard?_v=${Date.now()}`)).json()
    expect(dash.ahorros.totalMes).toBeGreaterThanOrEqual(250)
    expect(dash.ahorros.porMedio.some((m) => m.medioNombre === `Banco ${marca}`)).toBe(true)
  })

  test('un cuerpo inválido se rechaza con 4xx y sin enseñar el SQL', async ({ request }) => {
    // Los cinco llegaban al INSERT y devolvían un 500 con la consulta y sus
    // parámetros en el mensaje. La fecha va SIEMPRE válida a propósito: sin
    // ella el handler cortaba antes por su comprobación a mano y el test
    // pasaba sin llegar a ejercitar nada.
    const cuerpos = [
      { monto: 'mucho', fecha: hoy() },
      { monto: -10, fecha: hoy() },
      { monto: 0, fecha: hoy() },
      { monto: 1e30, fecha: hoy() },
      { monto: 10, fecha: 'no-es-fecha' },
      { monto: 10, fecha: hoy(), medioAhorroId: 'abc-123' },
    ]
    for (const data of cuerpos) {
      const r = await request.post('/api/ahorros', { data, failOnStatusCode: false })
      const etiqueta = JSON.stringify(data)
      expect(r.status(), etiqueta).toBeGreaterThanOrEqual(400)
      expect(r.status(), etiqueta).toBeLessThan(500)
      expect(await r.text(), etiqueta).not.toContain('Failed query')
    }
  })

  test('una meta mensual sin mes ni año no se guarda invisible', async ({ request }) => {
    // Se escribía con mes/anio NULL y la lectura la busca por (mes, anio):
    // el usuario fijaba una meta que después no veía en ningún sitio.
    const r = await request.put('/api/ahorros/metas', {
      data: { tipo: 'mensual', montoObjetivo: 500 },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(r.status()).toBeLessThan(500)
  })

  test('un mes no numérico en la meta no revienta la query', async ({ request }) => {
    const r = await request.put('/api/ahorros/metas', {
      data: { tipo: 'mensual', montoObjetivo: 500, mes: 'abc', anio: 2026 },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeLessThan(500)
    expect(await r.text()).not.toContain('Failed query')
  })

  test('no se puede apuntar un ahorro al medio de otra cuenta', async ({ request }) => {
    // El agujero: `medioAhorroId` aceptaba cualquier uuid sin comprobar de
    // quién era, y como la respuesta hace un join para devolver
    // `medioNombre`, mandar el id de un medio ajeno devolvía su nombre
    // —"Cuenta secreta de Ana 4512"—. Peor que un oráculo de una lectura:
    // la fila quedaba guardada apuntando ahí, así que el nombre ajeno
    // reaparecía en el listado del mes y en `porMedio` para siempre.
    const ajeno = await request.post('/api/ahorros/medios', {
      headers: otroUsuario,
      data: { nombre: `Secreta ${marca}`, icono: '🔒' },
      failOnStatusCode: false,
    })
    expect(ajeno.ok(), await ajeno.text()).toBeTruthy()
    const medioAjenoId = (await ajeno.json()).id

    const r = await request.post('/api/ahorros', {
      data: { monto: 10, fecha: hoy(), medioAhorroId: medioAjenoId },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(r.status()).toBeLessThan(500)
    expect(await r.text()).not.toContain(`Secreta ${marca}`)
  })

  test('la lectura tampoco cruza medios de otra cuenta', async ({ request }) => {
    // Defensa en profundidad: los leftJoin filtran por dueño además de por
    // id, así que una fila escrita ANTES del arreglo lee "sin medio" en vez
    // de arrastrar el nombre ajeno al listado y al dashboard.
    const lista = await request.get(`/api/ahorros?_v=${Date.now()}`)
    const cuerpo = await lista.text()
    expect(cuerpo).not.toContain(`Secreta ${marca}`)

    const dash = await request.get(`/api/dashboard?_v=${Date.now()}`)
    expect(await dash.text()).not.toContain(`Secreta ${marca}`)
  })
})

test.describe('Papelera', () => {
  test('un gasto borrado sale del listado y aparece en la papelera', async ({ request }) => {
    const creado = await request.post('/api/gastos', {
      data: {
        concepto: `Papelera ${marca}`,
        monto: 9.99,
        fecha: hoy(),
        categoriaId: await primeraCategoria(request),
      },
      failOnStatusCode: false,
    })
    const gastoId = (await creado.json()).id

    const borrado = await request.delete(`/api/gastos/${gastoId}`, { failOnStatusCode: false })
    expect(borrado.ok(), await borrado.text()).toBeTruthy()

    // Ya no está entre los activos…
    const activos = await (await request.get(`/api/gastos?fecha=${hoy()}&_v=${Date.now()}`)).json()
    expect(activos.some((g) => g.id === gastoId)).toBe(false)

    // …pero sí en la papelera.
    const papelera = await (await request.get(`/api/papelera?_v=${Date.now()}`)).json()
    const enPapelera = JSON.stringify(papelera)
    expect(enPapelera).toContain(gastoId)
  })

  test('restaurar devuelve el gasto al listado activo', async ({ request }) => {
    const creado = await request.post('/api/gastos', {
      data: {
        concepto: `Restaurable ${marca}`,
        monto: 5.55,
        fecha: hoy(),
        categoriaId: await primeraCategoria(request),
      },
      failOnStatusCode: false,
    })
    const gastoId = (await creado.json()).id
    await request.delete(`/api/gastos/${gastoId}`, { failOnStatusCode: false })

    const r = await request.post('/api/papelera/restaurar', {
      data: { entidad: 'gasto', id: gastoId },
      failOnStatusCode: false,
    })
    expect(r.ok(), await r.text()).toBeTruthy()

    const activos = await (await request.get(`/api/gastos?fecha=${hoy()}&_v=${Date.now()}`)).json()
    expect(activos.some((g) => g.id === gastoId)).toBe(true)
  })

  test('restaurar algo que no está borrado no inventa filas', async ({ request }) => {
    const creado = await request.post('/api/gastos', {
      data: {
        concepto: `NoBorrado ${marca}`,
        monto: 1.11,
        fecha: hoy(),
        categoriaId: await primeraCategoria(request),
      },
      failOnStatusCode: false,
    })
    const gastoId = (await creado.json()).id

    const r = await request.post('/api/papelera/restaurar', {
      data: { entidad: 'gasto', id: gastoId },
      failOnStatusCode: false,
    })
    // Sea 404 o 200 idempotente, lo que NO puede es ser un 500.
    expect(r.status()).toBeLessThan(500)
  })

  test('restaurar con un id malformado responde 4xx, no 500 con el SQL', async ({ request }) => {
    const r = await request.post('/api/papelera/restaurar', {
      data: { entidad: 'gasto', id: 'abc-123' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeLessThan(500)
    expect(await r.text()).not.toContain('Failed query')
  })

  test('restaurar una entidad desconocida se rechaza', async ({ request }) => {
    const r = await request.post('/api/papelera/restaurar', {
      data: { entidad: 'inventada', id: '550e8400-e29b-41d4-a716-446655440000' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(r.status()).toBeLessThan(500)
  })
})
