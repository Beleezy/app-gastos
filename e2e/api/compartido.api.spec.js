// E2E del módulo Compartido — visibilidad de gastos entre usuarios.
//
// Es el primer módulo que cruza la frontera usuario_id a propósito, así que
// el grueso de esta suite es negativo: comprobar qué NO se ve. Cada test que
// falle acá es una fuga de datos de una cuenta a otra, no un detalle de UX.
//
// Las tres identidades salen del bypass de auth dev (x-dev-user-id), que
// autoprovisiona el usuario en la primera petición.

import { test, expect } from '@playwright/test'

const TOKEN = process.env.DEV_AUTH_TOKEN || 'dev-token'
const sufijo = Date.now()

// Cada test estrena su propio trío de usuarios. Dos razones: el rate limit
// de invitaciones es de 5 por hora y por usuario (correcto: invitar hace
// aparecer tu nombre en la cuenta de un tercero), y así ningún test hereda
// conexiones de otro. El bypass de auth dev autoprovisiona al usuario en su
// primera petición, así que basta con inventar el id.
let contadorTests = 0

function identidades() {
  const n = ++contadorTests
  // El id lleva el timestamp de la corrida, no solo el contador: si dependiera
  // del contador, la corrida siguiente reusaría los mismos usuarios y heredaría
  // sus conexiones y su cuota de rate limit (que vive en memoria del servidor).
  const uid = (rol) =>
    `00000000-0000-0000-0000-${String(sufijo).slice(-8)}${String(n).padStart(3, '0')}${rol}`
  const persona = (rol, nombre) => ({
    'x-dev-auth-token': TOKEN,
    'x-dev-user-id': uid(rol),
    'x-dev-user-email': `${nombre}.${sufijo}.${n}@test.local`,
  })
  return { ANA: persona(1, 'ana'), BETO: persona(2, 'beto'), CARLA: persona(3, 'carla') }
}

const hoy = new Date()
const FECHA = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(
  Math.min(hoy.getDate(), 28),
).padStart(2, '0')}`

async function categoriasDe(request, headers) {
  const r = await request.get('/api/categorias', { headers })
  return r.ok() ? await r.json() : []
}

async function crearGasto(request, headers, data) {
  const r = await request.post('/api/gastos', { headers, data: { fecha: FECHA, ...data } })
  expect(r.ok(), `crear gasto: ${r.status()} ${await r.text()}`).toBeTruthy()
  return r.json()
}

/** Monta el escenario: Ana comparte "una" categoría con Beto y Beto acepta. */
async function escenario(request, { nivelDetalle = 'resumen' } = {}) {
  const { ANA, BETO, CARLA } = identidades()
  const cats = await categoriasDe(request, ANA)
  test.skip(cats.length < 2, 'Sin categorías sembradas')
  const [compartida, oculta] = cats

  const visible = await crearGasto(request, ANA, {
    concepto: `Visible ${sufijo}`,
    monto: 100,
    categoriaId: compartida.id,
    notas: 'NOTA-SECRETA-VISIBLE',
  })
  const privado = await crearGasto(request, ANA, {
    concepto: `PrivadoSecreto ${sufijo}`,
    monto: 50,
    categoriaId: compartida.id,
    visibilidad: 'privado',
    notas: 'NOTA-SECRETA-PRIVADA',
  })
  const otroRubro = await crearGasto(request, ANA, {
    concepto: `OtroRubro ${sufijo}`,
    monto: 70,
    categoriaId: oculta.id,
  })

  const inv = await request.post('/api/compartido/conexiones', {
    headers: ANA,
    data: {
      email: BETO['x-dev-user-email'],
      nivelDetalle,
      categorias: [{ categoriaId: compartida.id, umbralAviso: 70 }],
    },
  })
  expect(inv.ok(), `invitar: ${inv.status()} ${await inv.text()}`).toBeTruthy()
  const conexion = await inv.json()

  return { conexion, compartida, oculta, visible, privado, otroRubro, ANA, BETO, CARLA }
}

async function aceptar(request, conexionId, BETO) {
  const r = await request.post(`/api/compartido/conexiones/${conexionId}/aceptar`, {
    headers: BETO,
  })
  expect(r.ok(), `aceptar: ${r.status()} ${await r.text()}`).toBeTruthy()
}

test.describe('Compartido — aislamiento entre cuentas', () => {
  test('una invitación pendiente no muestra ni un gasto', async ({ request }) => {
    const { conexion, BETO } = await escenario(request)
    const r = await request.get(`/api/compartido/vista/${conexion.id}`, {
      headers: BETO,
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(404)
  })

  test('un tercero ajeno a la conexión recibe 404 en todos los caminos', async ({ request }) => {
    const { conexion, compartida, BETO, CARLA } = await escenario(request)
    await aceptar(request, conexion.id, BETO)

    const vista = await request.get(`/api/compartido/vista/${conexion.id}`, {
      headers: CARLA,
      failOnStatusCode: false,
    })
    // 404 y no 403: un 403 confirmaría que la conexión existe.
    expect(vista.status()).toBe(404)

    const avisos = await request.get(`/api/compartido/avisos?conexionId=${conexion.id}`, {
      headers: CARLA,
      failOnStatusCode: false,
    })
    expect(avisos.status()).toBe(404)

    const escribir = await request.post('/api/compartido/avisos', {
      headers: CARLA,
      data: { conexionId: conexion.id, mensaje: 'intruso', categoriaId: compartida.id },
      failOnStatusCode: false,
    })
    expect(escribir.status()).toBe(404)

    const alcance = await request.put(`/api/compartido/conexiones/${conexion.id}/alcance`, {
      headers: CARLA,
      data: { pausada: true },
      failOnStatusCode: false,
    })
    expect(alcance.status()).toBe(404)
  })

  test('el receptor no puede ampliarse el acceso', async ({ request }) => {
    const { conexion, BETO } = await escenario(request)
    await aceptar(request, conexion.id, BETO)

    const r = await request.put(`/api/compartido/conexiones/${conexion.id}/alcance`, {
      headers: BETO,
      data: { nivelDetalle: 'detalle' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(403)
  })

  test('pausar y revocar cortan el acceso al instante', async ({ request }) => {
    const { conexion, ANA, BETO } = await escenario(request)
    await aceptar(request, conexion.id, BETO)

    expect(
      (await request.get(`/api/compartido/vista/${conexion.id}`, { headers: BETO })).ok(),
    ).toBe(true)

    await request.put(`/api/compartido/conexiones/${conexion.id}/alcance`, {
      headers: ANA,
      data: { pausada: true },
    })
    const pausada = await request.get(`/api/compartido/vista/${conexion.id}`, {
      headers: BETO,
      failOnStatusCode: false,
    })
    expect(pausada.status()).toBe(404)

    await request.put(`/api/compartido/conexiones/${conexion.id}/alcance`, {
      headers: ANA,
      data: { pausada: false },
    })
    await request.delete(`/api/compartido/conexiones/${conexion.id}`, { headers: ANA })
    const revocada = await request.get(`/api/compartido/vista/${conexion.id}`, {
      headers: BETO,
      failOnStatusCode: false,
    })
    expect(revocada.status()).toBe(404)
  })
})

test.describe('Compartido — qué sale en el payload', () => {
  test('nivel resumen no filtra ni un concepto, ni notas, ni el gasto privado', async ({
    request,
  }) => {
    const { conexion, BETO } = await escenario(request, { nivelDetalle: 'resumen' })
    await aceptar(request, conexion.id, BETO)

    const r = await request.get(`/api/compartido/vista/${conexion.id}`, { headers: BETO })
    expect(r.ok()).toBeTruthy()
    const cuerpo = await r.text()

    expect(cuerpo).not.toContain('NOTA-SECRETA-VISIBLE')
    expect(cuerpo).not.toContain('NOTA-SECRETA-PRIVADA')
    expect(cuerpo).not.toContain('PrivadoSecreto')
    // En resumen, ni siquiera los conceptos de lo que SÍ ve.
    expect(cuerpo).not.toContain(`Visible ${sufijo}`)

    const vista = JSON.parse(cuerpo)
    expect(vista.detalle).toEqual([])
    // 100 visible, 50 privado excluido.
    const cat = vista.categorias.find((c) => c.alcance === 'completa')
    expect(cat.consumido).toBe(100)
  })

  test('nivel detalle expone concepto y monto, nunca notas ni transcripción', async ({
    request,
  }) => {
    const { conexion, BETO } = await escenario(request, { nivelDetalle: 'detalle' })
    await aceptar(request, conexion.id, BETO)

    const r = await request.get(`/api/compartido/vista/${conexion.id}`, { headers: BETO })
    const vista = await r.json()
    const cuerpo = JSON.stringify(vista)

    expect(vista.detalle.length).toBeGreaterThan(0)
    expect(cuerpo).toContain(`Visible ${sufijo}`)
    expect(cuerpo).not.toContain('NOTA-SECRETA-VISIBLE')
    expect(cuerpo).not.toContain('PrivadoSecreto')

    for (const g of vista.detalle) {
      expect(Object.keys(g).sort()).toEqual(
        ['categoriaId', 'concepto', 'fecha', 'id', 'monto', 'visibilidad'].sort(),
      )
    }
  })

  test('un gasto de rubro no compartido no aparece, y uno marcado sí', async ({ request }) => {
    const { conexion, otroRubro, ANA, BETO } = await escenario(request, { nivelDetalle: 'detalle' })
    await aceptar(request, conexion.id, BETO)

    let vista = await (
      await request.get(`/api/compartido/vista/${conexion.id}`, { headers: BETO })
    ).json()
    expect(JSON.stringify(vista)).not.toContain(`OtroRubro ${sufijo}`)

    // Ana lo marca a mano como compartido: ahora sí debe verse.
    await request.put(`/api/gastos/${otroRubro.id}`, {
      headers: ANA,
      data: { visibilidad: 'compartido' },
    })
    vista = await (
      await request.get(`/api/compartido/vista/${conexion.id}?fresh=1`, { headers: BETO })
    ).json()
    expect(JSON.stringify(vista)).toContain(`OtroRubro ${sufijo}`)

    // Y su rubro se marca como parcial: 70 no es el total de ese rubro.
    const parcial = vista.categorias.find((c) => c.alcance === 'solo_marcados')
    expect(parcial).toBeTruthy()
    expect(parcial.proyeccion).toBeNull()
  })

  test('un gasto en la papelera deja de verse', async ({ request }) => {
    const { conexion, visible, ANA, BETO } = await escenario(request, { nivelDetalle: 'detalle' })
    await aceptar(request, conexion.id, BETO)

    await request.delete(`/api/gastos/${visible.id}`, { headers: ANA })
    const vista = await (
      await request.get(`/api/compartido/vista/${conexion.id}?fresh=1`, { headers: BETO })
    ).json()
    expect(JSON.stringify(vista)).not.toContain(`Visible ${sufijo}`)
  })
})

test.describe('Compartido — avisos', () => {
  test('no se puede avisar sobre lo que no se ve, ni fabricar eventos de sistema', async ({
    request,
  }) => {
    const { conexion, compartida, oculta, privado, BETO } = await escenario(request)
    await aceptar(request, conexion.id, BETO)

    const ok = await request.post('/api/compartido/avisos', {
      headers: BETO,
      data: { conexionId: conexion.id, categoriaId: compartida.id, mensaje: 'Ojo con esto' },
    })
    expect(ok.ok(), await ok.text()).toBeTruthy()

    const rubroOculto = await request.post('/api/compartido/avisos', {
      headers: BETO,
      data: { conexionId: conexion.id, categoriaId: oculta.id, mensaje: 'x' },
      failOnStatusCode: false,
    })
    expect(rubroOculto.status()).toBe(404)

    // Si esto pasara, el endpoint sería un oráculo para adivinar ids ajenos.
    const gastoPrivado = await request.post('/api/compartido/avisos', {
      headers: BETO,
      data: { conexionId: conexion.id, gastoId: privado.id, mensaje: 'x' },
      failOnStatusCode: false,
    })
    expect(gastoPrivado.status()).toBe(404)

    const falsoSistema = await request.post('/api/compartido/avisos', {
      headers: BETO,
      data: { conexionId: conexion.id, tipo: 'sistema', mensaje: 'Dejó de compartir' },
      failOnStatusCode: false,
    })
    expect(falsoSistema.status()).toBe(400)

    const ambos = await request.post('/api/compartido/avisos', {
      headers: BETO,
      data: {
        conexionId: conexion.id,
        categoriaId: compartida.id,
        gastoId: privado.id,
        mensaje: 'x',
      },
      failOnStatusCode: false,
    })
    expect(ambos.status()).toBe(400)
  })

  test('quitar una categoría deja un evento de sistema en el feed', async ({ request }) => {
    const { conexion, ANA, BETO } = await escenario(request)
    await aceptar(request, conexion.id, BETO)

    await request.put(`/api/compartido/conexiones/${conexion.id}/alcance`, {
      headers: ANA,
      data: { categorias: [] },
    })

    const avisos = await (
      await request.get(`/api/compartido/avisos?conexionId=${conexion.id}`, { headers: BETO })
    ).json()
    const sistema = avisos.filter((a) => a.tipo === 'sistema')
    expect(sistema.some((a) => a.mensaje.includes('Dejó de compartir'))).toBe(true)
    // Los eventos de sistema no tienen autor.
    expect(sistema.every((a) => a.autorId === null)).toBe(true)
  })
})

test.describe('Compartido — invitaciones', () => {
  test('no se puede compartir consigo mismo ni invitar dos veces', async ({ request }) => {
    const { ANA } = identidades()
    const propio = await request.post('/api/compartido/conexiones', {
      headers: ANA,
      data: { email: ANA['x-dev-user-email'], categorias: [] },
      failOnStatusCode: false,
    })
    expect(propio.status()).toBe(400)

    const email = `dup.${sufijo}@test.local`
    const primera = await request.post('/api/compartido/conexiones', {
      headers: ANA,
      data: { email, categorias: [] },
    })
    expect(primera.ok()).toBeTruthy()

    const segunda = await request.post('/api/compartido/conexiones', {
      headers: ANA,
      data: { email, categorias: [] },
      failOnStatusCode: false,
    })
    expect(segunda.status()).toBe(409)

    // Tras revocar sí se puede volver a invitar.
    const { id } = await primera.json()
    await request.delete(`/api/compartido/conexiones/${id}`, { headers: ANA })
    const tercera = await request.post('/api/compartido/conexiones', {
      headers: ANA,
      data: { email, categorias: [] },
      failOnStatusCode: false,
    })
    expect(tercera.ok(), await tercera.text()).toBeTruthy()
  })

  test('el email inválido y el umbral fuera de rango se rechazan con 400', async ({ request }) => {
    const { ANA } = identidades()
    const malEmail = await request.post('/api/compartido/conexiones', {
      headers: ANA,
      data: { email: 'no-es-email', categorias: [] },
      failOnStatusCode: false,
    })
    expect(malEmail.status()).toBe(400)

    const cats = await categoriasDe(request, ANA)
    test.skip(!cats.length, 'Sin categorías')
    const malUmbral = await request.post('/api/compartido/conexiones', {
      headers: ANA,
      data: {
        email: `umbral.${sufijo}@test.local`,
        categorias: [{ categoriaId: cats[0].id, umbralAviso: 0 }],
      },
      failOnStatusCode: false,
    })
    expect(malUmbral.status()).toBe(400)
  })
})
