// E2E de /api/perfiles y /api/metricas.
//
// Los dos módulos estaban sin cobertura. Perfiles es el más delicado de
// los dos: un perfil gestionado ES una fila de `usuarios` con
// `gestionado_por_id`, así que el cuerpo va derecho a las columnas de esa
// tabla y un fallo de autorización no expone "un registro" sino una
// cuenta entera.

import { test, expect } from '@playwright/test'

const marca = Date.now()

// Segunda identidad. El bypass de auth dev autoprovisiona al usuario en su
// primera petición, así que basta con inventar el id.
function identidad(n, nombre) {
  return {
    'x-dev-auth-token': process.env.DEV_AUTH_TOKEN || '',
    'x-dev-user-id': `00000000-0000-0000-0000-${String(marca).slice(-8)}6${String(n).padStart(3, '0')}`,
    'x-dev-user-email': `${nombre}.${marca}@test.local`,
  }
}

async function crearPerfil(request, datos = {}) {
  const r = await request.post('/api/perfiles', {
    data: { nombre: `Perfil ${marca}`, ...datos },
    failOnStatusCode: false,
  })
  expect(r.ok(), await r.text()).toBeTruthy()
  return r.json()
}

test.describe('Perfiles gestionados', () => {
  test('crear un perfil lo deja en el listado con sus datos de contacto', async ({ request }) => {
    const creado = await crearPerfil(request, {
      nombre: `Mamá ${marca}`,
      telefono: '999888777',
      relacion: 'Madre',
      fechaNacimiento: '1960-04-12',
      presupuesto: 1500,
    })
    expect(creado.id).toBeTruthy()

    const lista = await (await request.get('/api/perfiles')).json()
    const enLista = lista.find((p) => p.id === creado.id)
    expect(enLista, 'el perfil recién creado no aparece en el listado').toBeTruthy()
    expect(enLista.nombre).toBe(`Mamá ${marca}`)
    expect(enLista.relacion).toBe('Madre')
    expect(enLista.presupuesto).toBe(1500)
  })

  test('editar un perfil conserva su presupuesto cuando el cuerpo lo manda vacío', async ({
    request,
  }) => {
    // El formulario manda '' en el campo de presupuesto cuando el usuario no
    // lo toca, y `actualizarPerfil` lo lee como "no tocar". Si el schema lo
    // coercionara a número, editar el nombre pondría el presupuesto a cero.
    const creado = await crearPerfil(request, { nombre: `Presu ${marca}`, presupuesto: 800 })

    const r = await request.patch(`/api/perfiles/${creado.id}`, {
      data: { nombre: `Presu ${marca} renombrado`, presupuesto: '' },
      failOnStatusCode: false,
    })
    expect(r.ok(), await r.text()).toBeTruthy()

    const lista = await (await request.get('/api/perfiles')).json()
    const p = lista.find((x) => x.id === creado.id)
    expect(p.nombre).toBe(`Presu ${marca} renombrado`)
    expect(p.presupuesto, 'editar el nombre no debe borrar el presupuesto').toBe(800)
  })

  test('un presupuesto explícito sí se guarda', async ({ request }) => {
    const creado = await crearPerfil(request, { nombre: `Presu2 ${marca}`, presupuesto: 800 })
    await request.patch(`/api/perfiles/${creado.id}`, {
      data: { nombre: `Presu2 ${marca}`, presupuesto: 950 },
      failOnStatusCode: false,
    })
    const lista = await (await request.get('/api/perfiles')).json()
    expect(lista.find((x) => x.id === creado.id).presupuesto).toBe(950)
  })

  test('borrar un perfil lo saca del listado', async ({ request }) => {
    const creado = await crearPerfil(request, { nombre: `Efímero ${marca}` })
    const r = await request.delete(`/api/perfiles/${creado.id}`, { failOnStatusCode: false })
    expect(r.ok(), await r.text()).toBeTruthy()

    const lista = await (await request.get('/api/perfiles')).json()
    expect(lista.some((p) => p.id === creado.id)).toBe(false)
  })

  test('una fecha de nacimiento inválida responde 4xx, no 500 con el SQL', async ({ request }) => {
    // `fecha_nacimiento` es una columna `date` y el servicio solo hacía
    // `String(v).trim()`: "ayer" llegaba al INSERT.
    for (const fechaNacimiento of ['ayer', '12/04/1960', '1960-4-2']) {
      const r = await request.post('/api/perfiles', {
        data: { nombre: 'X', fechaNacimiento },
        failOnStatusCode: false,
      })
      expect(r.status(), fechaNacimiento).toBeGreaterThanOrEqual(400)
      expect(r.status(), fechaNacimiento).toBeLessThan(500)
      expect(await r.text(), fechaNacimiento).not.toContain('Failed query')
    }
  })

  test('un nombre más largo que la columna se rechaza sin enseñar el SQL', async ({ request }) => {
    const r = await request.post('/api/perfiles', {
      data: { nombre: 'A'.repeat(5000) },
      failOnStatusCode: false,
    })
    expect(r.status()).toBeGreaterThanOrEqual(400)
    expect(r.status()).toBeLessThan(500)
    expect(await r.text()).not.toContain('Failed query')
  })

  test('un perfil sin nombre se rechaza', async ({ request }) => {
    for (const data of [{}, { nombre: '' }, { nombre: '   ' }]) {
      const r = await request.post('/api/perfiles', { data, failOnStatusCode: false })
      expect(r.status(), JSON.stringify(data)).toBeGreaterThanOrEqual(400)
      expect(r.status(), JSON.stringify(data)).toBeLessThan(500)
    }
  })

  test('no se puede editar ni borrar el perfil de otra cuenta', async ({
    request,
    playwright,
    baseURL,
  }) => {
    // Un perfil gestionado es una fila de `usuarios`: si esto fallara, no se
    // filtraría un registro sino el control de una cuenta.
    const mio = await crearPerfil(request, { nombre: `Mío ${marca}` })

    const ctxAjeno = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: identidad(1, 'intruso'),
    })

    const patch = await ctxAjeno.patch(`/api/perfiles/${mio.id}`, {
      data: { nombre: 'Secuestrado' },
      failOnStatusCode: false,
    })
    expect(patch.status(), 'un PATCH ajeno debe ser 404').toBe(404)

    const del = await ctxAjeno.delete(`/api/perfiles/${mio.id}`, { failOnStatusCode: false })
    expect(del.status(), 'un DELETE ajeno debe ser 404').toBe(404)

    // Y sigue intacto para su dueño.
    const lista = await (await request.get('/api/perfiles')).json()
    expect(lista.find((p) => p.id === mio.id).nombre).toBe(`Mío ${marca}`)

    // El listado del intruso tampoco lo ve.
    const listaAjena = await (await ctxAjeno.get('/api/perfiles')).json()
    expect(listaAjena.some((p) => p.id === mio.id)).toBe(false)
    await ctxAjeno.dispose()
  })

  test('el id de un USUARIO REAL no se puede adoptar como perfil propio', async ({ request }) => {
    // `gestionado_por_id` es lo que distingue un perfil de una cuenta real.
    // Un PATCH sobre el id de un usuario real tiene que dar 404, no editarlo.
    const r = await request.patch('/api/perfiles/00000000-0000-0000-0000-000000000102', {
      data: { nombre: 'Adoptado' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(404)
  })

  test('un id malformado responde 4xx, no 500 con el SQL', async ({ request }) => {
    for (const metodo of ['patch', 'delete']) {
      const r = await request[metodo]('/api/perfiles/abc-123', {
        data: { nombre: 'X' },
        failOnStatusCode: false,
      })
      expect(r.status(), metodo).toBeLessThan(500)
      expect(await r.text(), metodo).not.toContain('Failed query')
    }
  })
})

test.describe('Métricas', () => {
  test('el histórico devuelve una serie con los tres conceptos por mes', async ({ request }) => {
    const r = await request.get('/api/metricas/historico')
    expect(r.ok(), await r.text()).toBeTruthy()
    const d = await r.json()

    expect(Array.isArray(d.serie)).toBe(true)
    expect(d.serie.length).toBeGreaterThan(0)
    for (const clave of ['anio', 'mes', 'gastos', 'ingresos', 'ahorros', 'saldoNeto']) {
      expect(d.serie[0], `falta ${clave} en los puntos de la serie`).toHaveProperty(clave)
    }
  })

  test('la ventana se acota a 3-24 meses', async ({ request }) => {
    // Sin clamp, `meses=99999` construiría una serie de ocho mil entradas.
    const largo = async (q) =>
      (await (await request.get(`/api/metricas/historico${q}`)).json()).serie.length

    expect(await largo('?meses=99999')).toBeLessThanOrEqual(24)
    expect(await largo('?meses=1')).toBeGreaterThanOrEqual(3)
    expect(await largo('?meses=-5')).toBeGreaterThanOrEqual(3)
    // Un valor no numérico cae al default, no a NaN meses.
    expect(await largo('?meses=abc')).toBe(12)
  })

  test('la serie viene ordenada y sin huecos de mes', async ({ request }) => {
    // La página dibuja la serie tal cual: un mes fuera de orden o repetido
    // sale como un pico falso en el gráfico.
    const { serie } = await (await request.get('/api/metricas/historico?meses=12')).json()
    const claves = serie.map((p) => p.anio * 12 + p.mes)
    for (let i = 1; i < claves.length; i++) {
      expect(claves[i] - claves[i - 1], `salto entre ${i - 1} y ${i}`).toBe(1)
    }
    for (const p of serie) {
      expect(p.mes).toBeGreaterThanOrEqual(1)
      expect(p.mes).toBeLessThanOrEqual(12)
    }
  })

  test('los importes son números, no strings de Postgres', async ({ request }) => {
    // Las columnas son NUMERIC y el driver las devuelve como string. Si el
    // endpoint deja de convertirlas, el gráfico suma cadenas sin fallar.
    const { serie } = await (await request.get('/api/metricas/historico')).json()
    for (const p of serie) {
      for (const clave of ['gastos', 'ingresos', 'ahorros', 'saldoNeto']) {
        expect(typeof p[clave], `${clave} de ${p.anio}-${p.mes}`).toBe('number')
      }
    }
  })

  test('el saldo neto de cada mes cuadra con sus ingresos y gastos', async ({ request }) => {
    const { serie } = await (await request.get('/api/metricas/historico')).json()
    for (const p of serie) {
      expect(p.saldoNeto, `${p.anio}-${p.mes}`).toBeCloseTo(p.ingresos - p.gastos, 2)
    }
  })

  test('los recurrentes responden y con la ventana acotada', async ({ request }) => {
    for (const q of ['', '?meses=abc', '?meses=99999', '?meses=-1']) {
      const r = await request.get(`/api/metricas/recurrentes${q}`)
      expect(r.ok(), `${q}: ${await r.text()}`).toBeTruthy()
      const d = await r.json()
      expect(Array.isArray(d.candidatos), `${q}: candidatos`).toBe(true)
      expect(d.ventanaMeses, `${q}: ventana`).toBeGreaterThanOrEqual(3)
      expect(d.ventanaMeses, `${q}: ventana`).toBeLessThanOrEqual(12)
    }
  })
})
