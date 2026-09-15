// E2E de seguridad: rate limit, headers, IDOR, validación.

import { test, expect } from '@playwright/test'
import { hoyNegocioSeguro } from '../fechaNegocio.js'

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

// En la zona del usuario, no en la del runner: en un runner UTC, entre
// las 19:00 y las 24:00 de Lima `new Date()` devuelve el día siguiente.
const hoyIso = (request) => hoyNegocioSeguro(request)

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
        fecha: await hoyIso(request),
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
          {
            concepto: 'Sondeo lote',
            monto: 5,
            fecha: await hoyIso(request),
            categoriaId: categoriaDeAna,
          },
        ],
      },
      failOnStatusCode: false,
    })
    expect(bulk.status()).toBe(400)
    expect(await bulk.text()).not.toContain('Privada')

    // Y la vía cómoda: mover TODOS los gastos propios a la categoría ajena.
    const propio = await request.post('/api/gastos', {
      headers: BETO,
      data: { concepto: 'Propio', monto: 7, fecha: await hoyIso(request), categoriaId: null },
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
      gastos: [
        { concepto: `Único ${marca}`, monto: 33.33, fecha: await hoyIso(request), categoriaId },
      ],
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
    const lista = await request.get(`/api/gastos?fecha=${await hoyIso(request)}`, { headers: YO })
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

test.describe('Seguridad — cookie perfil-activo', () => {
  // `resolverPerfilEfectivo` (server/utils/getUsuario.js) decide el usuario
  // EFECTIVO de la petición a partir de esta cookie. Pasaba su valor crudo
  // a Postgres, así que una cookie malformada reventaba la query con un 500
  // que además filtraba el SQL — y no en un endpoint, sino en TODOS los de
  // perfil (gastos, ingresos, deudas, ahorros, futuros, dashboard,
  // planificador), porque el guard corre en `getUsuarioFromEvent`.
  const rutasDePerfil = [
    '/api/gastos?fecha=2026-09-09',
    '/api/dashboard',
    '/api/deudas/resumen',
    '/api/ingresos',
  ]

  for (const ruta of rutasDePerfil) {
    test(`una cookie malformada no rompe ${ruta.split('?')[0]}`, async ({ request }) => {
      const r = await request.get(ruta, {
        headers: { Cookie: 'perfil-activo=no-soy-uuid' },
        failOnStatusCode: false,
      })
      expect(r.status(), await r.text()).toBeLessThan(500)
      const cuerpo = await r.text()
      expect(cuerpo).not.toContain('Failed query')
      expect(cuerpo).not.toContain('select "id" from "usuarios"')
    })
  }

  test('una cookie vacía o basura cae al usuario real, no bloquea la app', async ({ request }) => {
    for (const valor of ['', 'null', 'undefined', '../../etc/passwd', "' OR 1=1--"]) {
      const r = await request.get('/api/gastos?fecha=2026-09-09', {
        headers: { Cookie: `perfil-activo=${encodeURIComponent(valor)}` },
        failOnStatusCode: false,
      })
      expect(r.ok(), `cookie "${valor}": ${r.status()}`).toBeTruthy()
    }
  })

  test('un perfil que existe pero es de OTRO usuario se ignora', async ({ request }) => {
    // El guard exige `gestionado_por_id = usuario real`. Un id de usuario
    // real ajeno no es un perfil gestionado: debe caer al usuario propio,
    // no leer los datos del otro.
    const ajeno = '00000000-0000-0000-0000-000000000102'
    const r = await request.get('/api/gastos?fecha=2026-09-09', {
      headers: { Cookie: `perfil-activo=${ajeno}` },
      failOnStatusCode: false,
    })
    expect(r.ok()).toBeTruthy()
  })
})

test.describe('Seguridad — categorías ajenas en el planificador', () => {
  // `assertCategoriasPropias` existía desde que se cerró el mismo agujero en
  // /api/gastos, y el planificador no lo llamaba. Reproducido: crear un
  // gasto planificado con el id de una categoría PRIVADA de otra cuenta
  // devolvía su nombre en `categoriaNombre`. En una app de finanzas el
  // nombre de una categoría privada ("Terapia psiquiátrica", "Abogado
  // divorcio") es justo lo que no puede cruzar cuentas.
  let categoriaAjena
  let nombreAjeno
  let planPropio
  let categoriaPropia

  test.beforeAll(async ({ playwright, baseURL }, testInfo) => {
    // `beforeAll` corre una vez por worker Y otra vez en cada reintento, y
    // el POST de categorías responde 409 ante un nombre repetido del mismo
    // usuario: la segunda ejecución fallaba con "Ya tienes una categoría con
    // ese nombre". Desambiguar por worker e intento lo vuelve determinista.
    nombreAjeno = `Privada ${marca}-w${testInfo.workerIndex}r${testInfo.retry}`
    const ctxAjeno = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: usuario(31, `vecino.w${testInfo.workerIndex}`),
    })
    const r = await ctxAjeno.post('/api/categorias', {
      data: { nombre: nombreAjeno, icono: '🔒', color: '#FF0000' },
      failOnStatusCode: false,
    })
    expect(r.ok(), await r.text()).toBeTruthy()
    categoriaAjena = (await r.json()).id
    await ctxAjeno.dispose()
  })

  test.beforeEach(async ({ request }) => {
    // El mes que consulta el plan tiene que ser el del USUARIO. En la noche
    // de Lima, el runner UTC ya está en el día —y el 30 o 31, en el mes—
    // siguiente, y el plan que devolvería sería otro.
    const [anio, mes] = (await hoyIso(request)).split('-')
    const plan = await request.get(`/api/planificador?mes=${Number(mes)}&anio=${anio}`)
    planPropio = (await plan.json()).plan.id
    const cats = await request.get('/api/categorias')
    categoriaPropia = (await cats.json())[0].id
  })

  test('crear un planificado con categoría ajena no devuelve su nombre', async ({ request }) => {
    const r = await request.post('/api/planificador/gastos', {
      data: {
        planMensualId: planPropio,
        categoriaId: categoriaAjena,
        concepto: 'sonda',
        montoEstimado: 10,
        fechaProbablePago: await hoyIso(request),
      },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(r.status()).toBeLessThan(500)
    expect(await r.text()).not.toContain(nombreAjeno)
  })

  test('editar un planificado propio para apuntarlo a una categoría ajena tampoco', async ({
    request,
  }) => {
    // El agujero tenía dos puertas: el POST y el PUT.
    const creado = await request.post('/api/planificador/gastos', {
      data: {
        planMensualId: planPropio,
        categoriaId: categoriaPropia,
        concepto: 'legítimo',
        montoEstimado: 10,
        fechaProbablePago: await hoyIso(request),
      },
      failOnStatusCode: false,
    })
    expect(creado.ok(), await creado.text()).toBeTruthy()
    const id = (await creado.json()).id

    const r = await request.put(`/api/planificador/gastos/${id}`, {
      data: { categoriaId: categoriaAjena },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(r.status()).toBeLessThan(500)
    expect(await r.text()).not.toContain(nombreAjeno)
  })

  test('un presupuesto por categoría ajena se rechaza', async ({ request }) => {
    const r = await request.post('/api/presupuestos-categoria', {
      data: { categoriaId: categoriaAjena, montoMensual: 100 },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(r.status()).toBeLessThan(500)
  })

  test('un gasto futuro con categoría ajena se rechaza', async ({ request }) => {
    const r = await request.post('/api/planificador/futuros', {
      data: {
        categoriaId: categoriaAjena,
        descripcion: 'sonda',
        detalles: [{ concepto: 'x' }],
      },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(r.status()).toBeLessThan(500)
    expect(await r.text()).not.toContain(nombreAjeno)
  })

  test('el camino legítimo sigue funcionando', async ({ request }) => {
    // Un guard que rompe el caso normal no es un guard, es una avería.
    const r = await request.post('/api/planificador/gastos', {
      data: {
        planMensualId: planPropio,
        categoriaId: categoriaPropia,
        concepto: `Alquiler ${marca}`,
        montoEstimado: 1200,
        fechaProbablePago: await hoyIso(request),
      },
      failOnStatusCode: false,
    })
    expect(r.ok(), await r.text()).toBeTruthy()
    const gasto = await r.json()
    expect(gasto.montoEstimado).toBe(1200)
    expect(gasto.categoriaNombre).toBeTruthy()
  })
})

test.describe('Seguridad — cuerpo ausente o no-objeto', () => {
  // `readBody` devuelve undefined sin cuerpo y null con el literal `null`.
  // Los handlers hacían acto seguido `body.campo` o destructuring, así que
  // ambos casos salían como 500 en vez del 400 que esos mismos handlers ya
  // devuelven para un cuerpo incompleto. La cola offline reintenta ante un
  // 500 y no ante un 400: el código equivocado convertía un fallo
  // permanente en un bucle de reintentos.
  const rutas = [
    ['PUT', '/api/planificador'],
    ['POST', '/api/planificador/gastos'],
    ['POST', '/api/planificador/duplicar'],
    ['POST', '/api/categorias'],
    ['POST', '/api/ahorros'],
    ['POST', '/api/ahorros/medios'],
    ['PUT', '/api/ahorros/metas'],
    ['POST', '/api/deudas/vinculos/desvincular'],
    ['POST', '/api/deudas/vinculos/checkpoints'],
    ['PATCH', '/api/integraciones/google/config'],
  ]

  for (const [metodo, ruta] of rutas) {
    test(`${metodo} ${ruta} sin cuerpo no es 500`, async ({ request }) => {
      const r = await request.fetch(ruta, { method: metodo, failOnStatusCode: false })
      expect(r.status(), `${metodo} ${ruta}`).toBeLessThan(500)
      expect(await r.text()).not.toContain('Failed query')
    })

    test(`${metodo} ${ruta} con cuerpos basura no es 500`, async ({ request }) => {
      for (const data of [null, [], 'texto', 42]) {
        const r = await request.fetch(ruta, { method: metodo, data, failOnStatusCode: false })
        const etiqueta = `${metodo} ${ruta} <- ${JSON.stringify(data)}`
        expect(r.status(), etiqueta).toBeLessThan(500)
        expect(await r.text(), etiqueta).not.toContain('Failed query')
      }
    })
  }
})

test.describe('Seguridad — query params de los listados', () => {
  // Los parámetros iban CRUDOS del query string a la consulta: `fecha` y
  // `mes`/`anio` a rangos contra columnas date, `categoriaId`/`personaId` a
  // `eq()` contra uuid, `estado`/`tipo` contra enums de Postgres. Once
  // combinaciones devolvían un 500 con la consulta y sus parámetros dentro,
  // y en los dos endpoints de LECTURA más golpeados: /api/gastos carga el
  // historial en cada visita a /registro. Basta una URL vieja en favoritos.
  const casos = [
    ['/api/gastos', '?mes=abc&anio=xyz'],
    ['/api/gastos', '?categoriaId=abc-123'],
    ['/api/gastos', '?fecha=no-es-fecha'],
    ['/api/gastos', '?mes=99&anio=1'],
    ['/api/gastos', '?limit=-1'],
    ['/api/gastos', '?orden=basura'],
    ['/api/gastos/resumen', '?mes=abc&anio=xyz'],
    ['/api/gastos/resumen', '?fecha=no-es-fecha'],
    ['/api/deudas', '?personaId=abc'],
    ['/api/deudas', '?estado=basura'],
    ['/api/deudas', '?tipo=inventado'],
    ['/api/ingresos', '?mes=99&anio=1'],
    ['/api/ingresos', '?offset=-5'],
    ['/api/planificador', '?mes=99&anio=1'],
    ['/api/presupuestos-categoria/estado', '?mes=99&anio=1'],
  ]

  for (const [ruta, query] of casos) {
    test(`GET ${ruta}${query} responde 4xx sin enseñar el SQL`, async ({ request }) => {
      const r = await request.get(`${ruta}${query}`, { failOnStatusCode: false })
      expect(r.status(), `${ruta}${query}`).toBeGreaterThanOrEqual(400)
      expect(r.status(), `${ruta}${query}`).toBeLessThan(500)
      expect(await r.text(), `${ruta}${query}`).not.toContain('Failed query')
    })
  }

  test('los filtros legítimos siguen funcionando', async ({ request }) => {
    // Un guard que rompe el caso normal no es un guard. `_v` y `_t` son los
    // cache busters que el cliente manda en cada petición.
    const [anio, mes] = (await hoyIso(request)).split('-')
    const rutas = [
      `/api/gastos?mes=${Number(mes)}&anio=${anio}`,
      `/api/gastos?mes=${Number(mes)}&anio=${anio}&_v=7`,
      `/api/gastos?fecha=${await hoyIso(request)}`,
      '/api/gastos',
      `/api/gastos/resumen?mes=${Number(mes)}&anio=${anio}&fecha=${await hoyIso(request)}`,
      '/api/deudas',
      '/api/deudas?tipo=me_deben',
      '/api/deudas?tipo=yo_debo&_t=1',
      `/api/ingresos?mes=${Number(mes)}&anio=${anio}`,
      `/api/planificador?mes=${Number(mes)}&anio=${anio}`,
    ]
    for (const ruta of rutas) {
      const r = await request.get(ruta, { failOnStatusCode: false })
      expect(r.ok(), `${ruta}: ${await r.text()}`).toBeTruthy()
    }
  })

  test('el filtro vacío se ignora en vez de filtrar por cadena vacía', async ({ request }) => {
    // El cliente manda `?fecha=` cuando el filtro no está puesto.
    const r = await request.get('/api/gastos?fecha=&categoriaId=&busqueda=', {
      failOnStatusCode: false,
    })
    expect(r.ok(), await r.text()).toBeTruthy()
  })
})

// ── Regresiones de la ronda 5 ──
//
// Un segundo fuzz —esta vez sobre los handlers que quedaban con `readBody`
// crudo y sobre los ids declarados como `string | number` en los schemas—
// devolvió 28 respuestas 500 con la consulta y sus parámetros dentro, más
// una categoría ajena aceptada por el PUT de gastos.

test.describe('Seguridad — ronda 5: ids que no son uuid y cuerpos sin schema', () => {
  // Cada fila es un caso que respondía 500 con el SQL en el mensaje.
  const casos = [
    ['POST', '/api/gastos', { concepto: 'x', monto: 1, fecha: '2026-01-01', categoriaId: 'abc' }],
    [
      'POST',
      '/api/gastos',
      { concepto: 'x', monto: 1, fecha: '2026-01-01', gastoPlanificadoId: 'abc' },
    ],
    ['DELETE', '/api/gastos/bulk', { ids: ['abc'] }],
    ['PUT', '/api/gastos/bulk', { ids: ['abc'], campos: { notas: 'x' } }],
    ['POST', '/api/gastos/bulk', { gastos: [{ concepto: 'x', monto: 1, categoriaId: 'abc' }] }],
    [
      'POST',
      '/api/deudas',
      { tipoDeuda: 'me_deben', concepto: 'x', monto: 1, personaEntidadId: 'abc' },
    ],
    ['POST', '/api/deudas/vinculos/solicitar', undefined],
    ['POST', '/api/deudas/vinculos/solicitar', { email: 'a@b.com', personaEntidadId: 'abc' }],
    [
      'POST',
      '/api/deudas/vinculos/solicitar',
      { email: 'no-es-email', personaEntidadId: '3f51518f-b0ef-4c4f-a0f0-b3a7c3caa01c' },
    ],
    ['POST', '/api/deudas/vinculos/desvincular', { personaEntidadId: 'abc' }],
    ['POST', '/api/deudas/vinculos/checkpoints', { personaId: 'abc' }],
    ['POST', '/api/deudas/personas/merge', { destinoId: 'abc', origenIds: ['def'] }],
    [
      'POST',
      '/api/planificador/duplicar',
      { mesOrigen: 'a', anioOrigen: 'b', mesDestino: 'c', anioDestino: 'd' },
    ],
    [
      'POST',
      '/api/planificador/duplicar',
      { mesOrigen: 9, anioOrigen: 2026, mesDestino: 9, anioDestino: 2026 },
    ],
    ['POST', '/api/planificador/plantillas', { nombre: 'x', desdePlanId: 'abc' }],
    ['POST', '/api/presupuestos-categoria', { categoriaId: 'abc', montoMensual: 5 }],
    ['PUT', '/api/configuraciones', { presupuestoMensualDefault: 'abc' }],
    ['PUT', '/api/configuraciones', { monedaPreferida: 'x'.repeat(30) }],
    ['PUT', '/api/configuraciones', { diaInicioCiclo: 'x' }],
    ['PUT', '/api/configuraciones', { locale: 'x'.repeat(30) }],
  ]

  for (const [metodo, ruta, data] of casos) {
    test(`${metodo} ${ruta} <- ${JSON.stringify(data)?.slice(0, 50)} responde 4xx sin el SQL`, async ({
      request,
    }) => {
      const r = await request.fetch(ruta, { method: metodo, data, failOnStatusCode: false })
      expect(r.status()).toBeGreaterThanOrEqual(400)
      expect(r.status()).toBeLessThan(500)
      const cuerpo = await r.text()
      expect(cuerpo).not.toContain('Failed query')
      expect(cuerpo).not.toContain('invalid input syntax')
    })
  }

  test('GET /api/deudas/personas?tipo=basura responde 400, no 500', async ({ request }) => {
    const r = await request.get('/api/deudas/personas?tipo=basura', { failOnStatusCode: false })
    expect(r.status()).toBe(400)
    const ok = await request.get('/api/deudas/personas?tipo=me_deben&_t=1', {
      failOnStatusCode: false,
    })
    expect(ok.ok(), await ok.text()).toBeTruthy()
  })

  test('GET /api/deudas/vinculos/checkpoints?personaId=abc responde 400', async ({ request }) => {
    const r = await request.get('/api/deudas/vinculos/checkpoints?personaId=abc', {
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(400)
    expect(await r.text()).not.toContain('Failed query')
  })

  test('PUT /api/configuraciones con el cuerpo completo de la pantalla sigue funcionando', async ({
    request,
  }) => {
    const r = await request.put('/api/configuraciones', {
      data: {
        nombre: 'E2E',
        presupuestoMensualDefault: 4500,
        monedaPreferida: 'PEN',
        diaInicioCiclo: 1,
        zonaHoraria: 'America/Lima',
        locale: 'es-PE',
        diasPdfSaldadas: 7,
        vistaRegistroDia: true,
        vistaRegistroSemana: false,
        tamanoLetra: 'normal',
        modoDaltonico: false,
      },
      failOnStatusCode: false,
    })
    expect(r.ok(), await r.text()).toBeTruthy()
    expect((await r.json()).zonaHoraria).toBe('America/Lima')
  })
})

test.describe('Seguridad — ronda 5: categoría ajena por el PUT de gastos', () => {
  test('editar un gasto propio para apuntarlo a una categoría privada ajena se rechaza', async ({
    request,
  }) => {
    const ANA = usuario(41, 'ana-put')
    const BETO = usuario(42, 'beto-put')

    const cat = await request.post('/api/categorias', {
      headers: ANA,
      data: { nombre: `Reservada ${marca}`, icono: '🔒', color: '#ff00ff' },
      failOnStatusCode: false,
    })
    expect(cat.ok(), await cat.text()).toBeTruthy()
    const categoriaDeAna = (await cat.json()).id

    const propia = await request.post('/api/categorias', {
      headers: BETO,
      data: { nombre: `Mía ${marca}`, icono: '🙂', color: '#00ffff' },
      failOnStatusCode: false,
    })
    const categoriaDeBeto = (await propia.json()).id

    const gasto = await request.post('/api/gastos', {
      headers: BETO,
      data: {
        concepto: 'Propio',
        monto: 7,
        fecha: await hoyIso(request),
        categoriaId: categoriaDeBeto,
      },
      failOnStatusCode: false,
    })
    expect(gasto.ok(), await gasto.text()).toBeTruthy()
    const gastoId = (await gasto.json()).id

    // Antes: 200, la fila quedaba apuntando a la categoría ajena y la
    // respuesta traía `categoriaNombre: "Reservada ..."`.
    const put = await request.put(`/api/gastos/${gastoId}`, {
      headers: BETO,
      data: { categoriaId: categoriaDeAna },
      failOnStatusCode: false,
    })
    expect(put.status()).toBe(400)
    expect(await put.text()).not.toContain('Reservada')

    // Y el gasto sigue con su categoría.
    const lista = await request.get(`/api/gastos?fecha=${await hoyIso(request)}`, { headers: BETO })
    const fila = (await lista.json()).find((g) => g.id === gastoId)
    expect(fila?.categoriaId).toBe(categoriaDeBeto)
  })

  test('aplicar una plantilla con una categoría ajena no la usa', async ({ request }) => {
    const ANA = usuario(43, 'ana-tpl')
    const BETO = usuario(44, 'beto-tpl')

    const cat = await request.post('/api/categorias', {
      headers: ANA,
      data: { nombre: `Oculta ${marca}`, icono: '🔒', color: '#123456' },
      failOnStatusCode: false,
    })
    const categoriaDeAna = (await cat.json()).id

    // Beto necesita al menos una categoría propia como reserva.
    await request.post('/api/categorias', {
      headers: BETO,
      data: { nombre: `Otros ${marca}`, icono: '📦', color: '#654321' },
      failOnStatusCode: false,
    })

    const [anio, mes] = (await hoyIso(request)).split('-')
    const plan = await request.get(`/api/planificador?mes=${Number(mes)}&anio=${anio}`, {
      headers: BETO,
    })
    const planId = (await plan.json()).plan.id

    const tpl = await request.post('/api/planificador/plantillas', {
      headers: BETO,
      data: {
        nombre: `Ajena ${marca}`,
        gastos: [
          { concepto: 'Sonda', montoEstimado: 5, categoriaId: categoriaDeAna, diaProbable: 1 },
        ],
      },
      failOnStatusCode: false,
    })
    expect(tpl.ok(), await tpl.text()).toBeTruthy()

    const apl = await request.post(
      `/api/planificador/plantillas/${(await tpl.json()).id}/aplicar`,
      {
        headers: BETO,
        data: { planMensualId: planId },
        failOnStatusCode: false,
      },
    )
    expect(apl.ok(), await apl.text()).toBeTruthy()
    // Antes: `categoriasReemplazadas: 0` y el planificado quedaba apuntando
    // a la categoría privada de Ana.
    expect((await apl.json()).categoriasReemplazadas).toBe(1)

    const planificados = (
      await (
        await request.get(`/api/planificador?mes=${Number(mes)}&anio=${anio}`, { headers: BETO })
      ).json()
    ).gastos
    expect(planificados.some((g) => g.categoriaId === categoriaDeAna)).toBe(false)
  })
})

test.describe('Seguridad — ronda 5: saldos y papelera', () => {
  test('editar y revertir un pago recalculan el saldo desde los pagos vivos', async ({
    request,
  }) => {
    const YO = usuario(45, 'saldos')
    const deuda = await request.post('/api/deudas', {
      headers: YO,
      data: {
        tipoDeuda: 'me_deben',
        concepto: `Saldo ${marca}`,
        monto: 100,
        personaNombre: 'Saldos',
      },
      failOnStatusCode: false,
    })
    expect(deuda.ok(), await deuda.text()).toBeTruthy()
    const deudaId = (await deuda.json()).id
    const fecha = await hoyIso(request)

    const p1 = await request.post(`/api/deudas/${deudaId}/pagos`, {
      headers: YO,
      data: { monto: 30, fechaPago: fecha },
    })
    const pago1 = (await p1.json()).pago.id
    await request.post(`/api/deudas/${deudaId}/pagos`, {
      headers: YO,
      data: { monto: 20, fechaPago: fecha },
    })

    // Editar el primer pago a 50: pagado 70, pendiente 30.
    const edit = await request.put(`/api/deudas/pagos/${pago1}`, {
      headers: YO,
      data: { monto: 50 },
      failOnStatusCode: false,
    })
    expect(edit.ok(), await edit.text()).toBeTruthy()
    expect((await edit.json()).deuda.montoPendiente).toBe(30)

    // Un monto que deje la deuda pagada de más se rechaza y no toca nada.
    const exceso = await request.put(`/api/deudas/pagos/${pago1}`, {
      headers: YO,
      data: { monto: 90 },
      failOnStatusCode: false,
    })
    expect(exceso.status()).toBe(400)

    // Revertir el primer pago: queda solo el de 20 → pendiente 80.
    const rev = await request.delete(`/api/deudas/pagos/${pago1}`, {
      headers: YO,
      failOnStatusCode: false,
    })
    expect(rev.ok(), await rev.text()).toBeTruthy()
    expect((await rev.json()).nuevoPendiente).toBe(80)

    const detalle = await request.get(`/api/deudas/${deudaId}`, { headers: YO })
    expect((await detalle.json()).montoPendiente).toBe(80)
    expect((await detalle.json()).estado).toBe('parcial')
  })

  test('PUT de un pago sin cuerpo o con fecha inventada responde 400', async ({ request }) => {
    const YO = usuario(46, 'pago-put')
    const deuda = await request.post('/api/deudas', {
      headers: YO,
      data: { tipoDeuda: 'yo_debo', concepto: `Put ${marca}`, monto: 10, personaNombre: 'Put' },
    })
    const deudaId = (await deuda.json()).id
    const p = await request.post(`/api/deudas/${deudaId}/pagos`, {
      headers: YO,
      data: { monto: 5, fechaPago: await hoyIso(request) },
    })
    const pagoId = (await p.json()).pago.id

    for (const data of [undefined, null, { fechaPago: 'el martes' }, { monto: 'mucho' }]) {
      const r = await request.fetch(`/api/deudas/pagos/${pagoId}`, {
        method: 'PUT',
        data,
        failOnStatusCode: false,
      })
      expect(r.status(), JSON.stringify(data)).toBe(400)
    }
  })

  test('borrar un planificado pagado manda su gasto real a la papelera, no lo destruye', async ({
    request,
  }) => {
    const YO = usuario(47, 'papelera-plan')
    const cat = await request.post('/api/categorias', {
      headers: YO,
      data: { nombre: `Plan ${marca}`, icono: '📅', color: '#0f0f0f' },
    })
    const categoriaId = (await cat.json()).id
    const hoy = await hoyIso(request)
    const [anio, mes] = hoy.split('-')
    const plan = await request.get(`/api/planificador?mes=${Number(mes)}&anio=${anio}`, {
      headers: YO,
    })
    const planId = (await plan.json()).plan.id

    const creado = await request.post('/api/planificador/gastos', {
      headers: YO,
      data: {
        planMensualId: planId,
        categoriaId,
        concepto: `Pagado ${marca}`,
        montoEstimado: 42,
        fechaProbablePago: hoy,
      },
    })
    const planificadoId = (await creado.json()).id

    const registro = await request.post(`/api/planificador/gastos/${planificadoId}/registro`, {
      headers: YO,
      data: { fechaPago: hoy },
      failOnStatusCode: false,
    })
    expect(registro.ok(), await registro.text()).toBeTruthy()
    const gastoId = (await registro.json()).gasto.id

    const borrar = await request.delete(`/api/planificador/gastos/${planificadoId}`, {
      headers: YO,
    })
    expect(borrar.ok()).toBeTruthy()

    // Antes: DELETE físico del gasto. Ahora está en la papelera y se puede
    // restaurar.
    const papelera = await (await request.get('/api/papelera', { headers: YO })).json()
    expect(papelera.gastos.some((g) => g.id === gastoId)).toBe(true)
    const restaurar = await request.post('/api/papelera/restaurar', {
      headers: YO,
      data: { entidad: 'gasto', id: gastoId },
      failOnStatusCode: false,
    })
    expect(restaurar.ok(), await restaurar.text()).toBeTruthy()
  })

  test('fusionar personas conserva en la papelera las deudas borradas de la persona origen', async ({
    request,
  }) => {
    const YO = usuario(48, 'merge-papelera')
    const origen = await request.post('/api/deudas/personas', {
      headers: YO,
      data: { nombre: `Origen ${marca}` },
    })
    const destino = await request.post('/api/deudas/personas', {
      headers: YO,
      data: { nombre: `Destino ${marca}` },
    })
    const origenId = (await origen.json()).id
    const destinoId = (await destino.json()).id

    const deuda = await request.post('/api/deudas', {
      headers: YO,
      data: {
        tipoDeuda: 'me_deben',
        concepto: `Borrada ${marca}`,
        monto: 15,
        personaEntidadId: origenId,
      },
    })
    const deudaId = (await deuda.json()).id
    await request.delete(`/api/deudas/${deudaId}`, { headers: YO })

    const merge = await request.post('/api/deudas/personas/merge', {
      headers: YO,
      data: { destinoId, origenIds: [origenId] },
      failOnStatusCode: false,
    })
    expect(merge.ok(), await merge.text()).toBeTruthy()

    // Antes el cascade de la persona origen purgaba la deuda de la papelera.
    const papelera = await (await request.get('/api/papelera', { headers: YO })).json()
    expect(papelera.deudas.some((d) => d.id === deudaId)).toBe(true)
  })
})
