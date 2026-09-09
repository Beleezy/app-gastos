// E2E de seguridad: rate limit, headers, IDOR, validación.

import { test, expect } from '@playwright/test'

test.describe('Seguridad', () => {
  test('API: rate limit en /api/voz/parse devuelve 429 al excederse', async ({ request }) => {
    // 21 requests rápidos al voz/parse — el 21º debe ser 429.
    const responses = []
    for (let i = 0; i < 21; i++) {
      const r = await request.post('/api/voz/parse', {
        data: { texto: `prueba ${i}` },
        failOnStatusCode: false,
      })
      responses.push(r.status())
    }
    // Al menos uno debe ser 429
    expect(responses).toContain(429)
  })

  test('API: input demasiado largo en voz/parse → 413', async ({ request }) => {
    const r = await request.post('/api/voz/parse', {
      data: { texto: 'a'.repeat(3000) },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(413)
  })

  test('API: imagen sobre 8MB → 413', async ({ request }) => {
    const r = await request.post('/api/voz/parse-image', {
      data: { image: 'a'.repeat(9_000_000) },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(413)
  })

  test('Headers de seguridad globales están presentes', async ({ request }) => {
    const r = await request.get('/api/health')
    const headers = r.headers()
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['permissions-policy']).toContain('camera=(self)')
  })

  test('Rate limit headers presentes en endpoints LLM', async ({ request }) => {
    const r = await request.post('/api/voz/parse', {
      data: { texto: 'test' },
      failOnStatusCode: false,
    })
    const headers = r.headers()
    // Estos headers se setean siempre, ok o 429
    expect(headers['x-ratelimit-limit']).toBeDefined()
    expect(headers['x-ratelimit-remaining']).toBeDefined()
  })

  test('/api/health responde y reporta DB ok', async ({ request }) => {
    const r = await request.get('/api/health')
    expect(r.ok()).toBeTruthy()
    const body = await r.json()
    expect(body.status).toBe('ok')
    expect(body.checks?.db).toBe('ok')
  })

  test('Cron expirar-solicitudes sin token → 401', async ({ request }) => {
    const r = await request.post('/api/cron/expirar-solicitudes', {
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(401)
  })
})

// ── Regresiones de la ronda de hardening ──
//
// Cada test de acá corresponde a un agujero real que estaba abierto. Si
// alguno se pone rojo, el agujero volvió.

const TOKEN_DEV = process.env.DEV_AUTH_TOKEN || 'dev-token'
const marca = Date.now()

// Identidades independientes: el bypass de auth dev autoprovisiona al
// usuario en su primera petición, así que basta con inventar el id.
function usuario(n, nombre) {
  return {
    'x-dev-auth-token': TOKEN_DEV,
    'x-dev-user-id': `00000000-0000-0000-0000-${String(marca).slice(-8)}9${String(n).padStart(3, '0')}`,
    'x-dev-user-email': `${nombre}.${marca}@test.local`,
  }
}

const hoyIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(Math.min(d.getDate(), 28)).padStart(2, '0')}`
}

test.describe('Seguridad — ids de ruta malformados', () => {
  // Un id que no es UUID llegaba crudo a Postgres: la query reventaba con
  // `invalid input syntax for type uuid` y salía un 500 que además
  // arrastraba el mensaje del driver hasta el cliente.
  const rutas = [
    ['/api/gastos/abc-123', 'PUT'],
    ['/api/gastos/abc-123', 'DELETE'],
    ['/api/deudas/abc-123', 'GET'],
    ['/api/deudas/abc-123', 'DELETE'],
    ['/api/ingresos/abc-123', 'DELETE'],
    ['/api/ahorros/abc-123', 'DELETE'],
    ['/api/categorias/abc-123', 'DELETE'],
    ['/api/deudas/personas/abc-123/pagos-historial', 'GET'],
    ["/api/gastos/' OR 1=1--", 'DELETE'],
  ]

  for (const [ruta, metodo] of rutas) {
    test(`${metodo} ${ruta} responde 404, nunca 500`, async ({ request }) => {
      const r = await request.fetch(ruta, {
        method: metodo,
        data: metodo === 'PUT' ? { concepto: 'x' } : undefined,
        failOnStatusCode: false,
      })
      expect(r.status(), `${metodo} ${ruta}`).toBe(404)

      // Y el cuerpo no filtra el error del driver de Postgres.
      const cuerpo = await r.text()
      expect(cuerpo).not.toContain('invalid input syntax')
      expect(cuerpo).not.toContain('Failed query')
    })
  }
})

test.describe('Seguridad — categoría de otra cuenta (IDOR)', () => {
  test('no se puede crear un gasto con la categoría privada de otro usuario', async ({
    request,
  }) => {
    const ANA = usuario(1, 'ana-cat')
    const BETO = usuario(2, 'beto-cat')

    // Ana crea una categoría privada suya.
    const crear = await request.post('/api/categorias', {
      headers: ANA,
      data: { nombre: `Secreta ${marca}`, icono: '🔒', color: '#ff0000' },
      failOnStatusCode: false,
    })
    expect(crear.ok(), await crear.text()).toBeTruthy()
    const categoriaDeAna = (await crear.json()).id

    // Beto intenta usarla. Antes esto devolvía 200 y la respuesta traía
    // `categoriaNombre: "Secreta ..."` — un oráculo para leer las
    // categorías de otras cuentas.
    const r = await request.post('/api/gastos', {
      headers: BETO,
      data: {
        concepto: 'Sondeo',
        monto: 10,
        fecha: hoyIso(),
        categoriaId: categoriaDeAna,
      },
      failOnStatusCode: false,
    })

    expect(r.status()).toBe(400)
    expect(await r.text()).not.toContain('Secreta')
  })

  test('tampoco por lote, ni reasignando en lote', async ({ request }) => {
    const ANA = usuario(3, 'ana-bulk')
    const BETO = usuario(4, 'beto-bulk')

    const crear = await request.post('/api/categorias', {
      headers: ANA,
      data: { nombre: `Privada ${marca}`, icono: '🔒', color: '#00ff00' },
      failOnStatusCode: false,
    })
    const categoriaDeAna = (await crear.json()).id

    const bulk = await request.post('/api/gastos/bulk', {
      headers: BETO,
      data: {
        gastos: [
          { concepto: 'Sondeo lote', monto: 5, fecha: hoyIso(), categoriaId: categoriaDeAna },
        ],
      },
      failOnStatusCode: false,
    })
    expect(bulk.status()).toBe(400)
    expect(await bulk.text()).not.toContain('Privada')

    // Y la vía cómoda: mover TODOS los gastos propios a la categoría ajena.
    const propio = await request.post('/api/gastos', {
      headers: BETO,
      data: { concepto: 'Propio', monto: 7, fecha: hoyIso(), categoriaId: null },
      failOnStatusCode: false,
    })
    if (propio.ok()) {
      const gastoId = (await propio.json()).id
      const put = await request.put('/api/gastos/bulk', {
        headers: BETO,
        data: { ids: [gastoId], campos: { categoriaId: categoriaDeAna } },
        failOnStatusCode: false,
      })
      expect(put.status()).toBe(400)
    }
  })
})

test.describe('Seguridad — validación de /api/gastos/bulk', () => {
  // El handler leía `readBody` crudo: el schema existía y no se usaba, así
  // que un monto no numérico o una fecha inventada llegaban a Postgres y
  // salían como 500 del driver en vez de un 400 explicando el campo.
  const cuerposInvalidos = [
    ['monto no numérico', { gastos: [{ concepto: 'x', monto: 'mucho', fecha: '2026-01-01' }] }],
    ['monto negativo', { gastos: [{ concepto: 'x', monto: -50, fecha: '2026-01-01' }] }],
    ['monto cero', { gastos: [{ concepto: 'x', monto: 0, fecha: '2026-01-01' }] }],
    ['fecha inventada', { gastos: [{ concepto: 'x', monto: 5, fecha: 'el martes' }] }],
    ['lista vacía', { gastos: [] }],
    ['sin lista', {}],
    // La categoría es obligatoria porque la columna es NOT NULL. Antes este
    // caso llegaba al INSERT y salía como 500 del driver, mientras que el
    // POST simple —que la comprueba a mano— devolvía un 400 claro.
    ['sin categoría', { gastos: [{ concepto: 'x', monto: 5, fecha: '2026-01-01' }] }],
  ]

  for (const [caso, data] of cuerposInvalidos) {
    test(`${caso} → 4xx con detalle, no 500`, async ({ request }) => {
      const r = await request.post('/api/gastos/bulk', { data, failOnStatusCode: false })
      expect(r.status(), caso).toBeGreaterThanOrEqual(400)
      expect(r.status(), caso).toBeLessThan(500)
    })
  }
})

test.describe('Seguridad — idempotencia entre instancias', () => {
  test('el mismo Idempotency-Key no inserta el gasto dos veces', async ({ request }) => {
    const YO = usuario(5, 'idem')
    const clave = `e2e-idem-${marca}`

    // `gastos.categoria_id` es NOT NULL: hace falta una categoría propia.
    const cat = await request.post('/api/categorias', {
      headers: YO,
      data: { nombre: `Idem ${marca}`, icono: '🔁', color: '#0000ff' },
      failOnStatusCode: false,
    })
    const categoriaId = (await cat.json()).id

    const data = {
      gastos: [{ concepto: `Único ${marca}`, monto: 33.33, fecha: hoyIso(), categoriaId }],
      metodoRegistro: 'manual',
    }

    const primera = await request.post('/api/gastos/bulk', {
      headers: { ...YO, 'Idempotency-Key': clave },
      data,
      failOnStatusCode: false,
    })
    expect(primera.ok(), await primera.text()).toBeTruthy()
    const creados = await primera.json()
    expect(creados).toHaveLength(1)

    // El reintento devuelve la MISMA fila, no una nueva.
    const reintento = await request.post('/api/gastos/bulk', {
      headers: { ...YO, 'Idempotency-Key': clave },
      data,
      failOnStatusCode: false,
    })
    expect(reintento.ok()).toBeTruthy()
    expect(reintento.headers()['x-idempotent-replay']).toBe('true')
    expect((await reintento.json())[0].id).toBe(creados[0].id)

    // Y en la BD hay uno solo.
    const lista = await request.get(`/api/gastos?fecha=${hoyIso()}`, { headers: YO })
    const coincidencias = (await lista.json()).filter((g) => g.concepto === `Único ${marca}`)
    expect(coincidencias).toHaveLength(1)
  })
})

test.describe('Seguridad — schemas que existían sin cablear', () => {
  // Los tres schemas de abajo estaban escritos en shared/schemas/ y ningún
  // handler los usaba. Uno de ellos, `tipoPersonaSchema`, lleva un
  // comentario que describe EXACTAMENTE el fallo que seguía vivo:
  // "'entidad'/'banco'/'otro' pasaban la validación para luego reventar en
  // el INSERT contra el pgEnum".

  test('crear persona con un tipo inválido responde 400, no 500 con el SQL', async ({
    request,
  }) => {
    const r = await request.post('/api/deudas/personas', {
      data: { nombre: `Tipo malo ${marca}`, tipo: 'basura' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(r.status()).toBeLessThan(500)
    const cuerpo = await r.text()
    expect(cuerpo).not.toContain('Failed query')
    expect(cuerpo).not.toContain('insert into')
  })

  test('los tipos legacy se aceptan y se traducen al enum de la BD', async ({ request }) => {
    // `tipoPersonaSchema` transforma 'entidad'/'banco' → 'organizacion' y
    // 'otro' → 'persona'. Sin cablearlo, esos valores llegaban crudos al
    // INSERT y reventaban.
    for (const [entrada, esperado] of [
      ['entidad', 'organizacion'],
      ['banco', 'organizacion'],
      ['otro', 'persona'],
    ]) {
      const r = await request.post('/api/deudas/personas', {
        data: { nombre: `Legacy ${entrada} ${marca}`, tipo: entrada },
        failOnStatusCode: false,
      })
      expect(r.ok(), `${entrada}: ${await r.text()}`).toBeTruthy()
      expect((await r.json()).tipo, `${entrada} debe guardarse como ${esperado}`).toBe(esperado)
    }
  })

  test('crear persona sin nombre responde 400', async ({ request }) => {
    const r = await request.post('/api/deudas/personas', {
      data: { tipo: 'persona' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(400)
  })

  test('el borrado en lote valida la lista de ids', async ({ request }) => {
    for (const data of [
      {},
      { ids: [] },
      { ids: Array.from({ length: 501 }, (_, i) => `id-${i}`) },
    ]) {
      const r = await request.fetch('/api/gastos/bulk', {
        method: 'DELETE',
        data,
        failOnStatusCode: false,
      })
      expect(r.status(), JSON.stringify(data).slice(0, 40)).toBeGreaterThanOrEqual(400)
      expect(r.status()).toBeLessThan(500)
    }
  })

  test('el pago global valida el cuerpo antes de tocar la BD', async ({ request }) => {
    const persona = await request.post('/api/deudas/personas', {
      data: { nombre: `PagoGlobal ${marca}` },
      failOnStatusCode: false,
    })
    const personaId = (await persona.json()).id

    for (const data of [
      { monto: 'mucho' },
      { monto: -5 },
      { monto: 0 },
      { monto: 10, fecha: 'el martes' },
      {},
    ]) {
      const r = await request.post(`/api/deudas/personas/${personaId}/pago-global`, {
        data,
        failOnStatusCode: false,
      })
      expect(r.status(), JSON.stringify(data)).toBeGreaterThanOrEqual(400)
      expect(r.status(), JSON.stringify(data)).toBeLessThan(500)
    }
  })
})
