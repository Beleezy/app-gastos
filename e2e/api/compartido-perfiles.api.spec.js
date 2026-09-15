// Compartido + perfiles de familia (compartido_perfiles, migración 0038).
//
// Ana gestiona el perfil "Peque". Comparte una categoría con Beto. Por
// defecto Beto ve solo los gastos de Ana; si Ana incluye a Peque en la
// conexión, también los de Peque; nadie puede incluir un perfil ajeno.

import { test, expect } from '@playwright/test'
import { fechaEnZona } from '../fechaNegocio.js'

const TOKEN = process.env.DEV_AUTH_TOKEN || 'dev-token'
const sufijo = Date.now()
let contador = 0

function identidades() {
  const n = ++contador
  const uid = (rol) =>
    `00000000-0000-0000-0000-${String(sufijo).slice(-8)}${String(n).padStart(3, '0')}${rol}`
  const persona = (rol, nombre) => ({
    'x-dev-auth-token': TOKEN,
    'x-dev-user-id': uid(rol),
    'x-dev-user-email': `${nombre}.perf.${sufijo}.${n}@test.local`,
  })
  return { ANA: persona(4, 'ana'), BETO: persona(5, 'beto') }
}

const FECHA = fechaEnZona(new Date(), 'America/Lima')
const [ANIO, MES] = FECHA.split('-').map(Number)

async function escenario(request) {
  const { ANA, BETO } = identidades()
  const cats = await (await request.get('/api/categorias', { headers: ANA })).json()
  test.skip(cats.length < 1, 'Sin categorías sembradas')
  const cat = cats[0]
  // Perfil de familia de Ana y un gasto anotado como ese perfil.
  const perfil = await (
    await request.post('/api/perfiles', { headers: ANA, data: { nombre: `Peque ${sufijo}` } })
  ).json()
  expect(perfil.id).toBeTruthy()
  const cookie = `perfil-activo=${perfil.id}`
  const dePeque = await (
    await request.post('/api/gastos', {
      headers: { ...ANA, cookie },
      data: { concepto: `DePeque ${sufijo}`, monto: 33, categoriaId: cat.id, fecha: FECHA },
    })
  ).json()
  const deAna = await (
    await request.post('/api/gastos', {
      headers: ANA,
      data: { concepto: `DeAna ${sufijo}`, monto: 11, categoriaId: cat.id, fecha: FECHA },
    })
  ).json()
  const inv = await request.post('/api/compartido/conexiones', {
    headers: ANA,
    data: {
      email: BETO['x-dev-user-email'],
      nivelDetalle: 'detalle',
      categorias: [{ categoriaId: cat.id, umbralAviso: 70 }],
    },
  })
  expect(inv.ok(), await inv.text()).toBeTruthy()
  const conexion = await inv.json()
  const acept = await request.post(`/api/compartido/conexiones/${conexion.id}/aceptar`, {
    headers: BETO,
  })
  expect(acept.ok(), await acept.text()).toBeTruthy()
  return { ANA, BETO, cat, perfil, dePeque, deAna, conexion }
}

async function vista(request, headers, conexionId) {
  const r = await request.get(`/api/compartido/vista/${conexionId}`, {
    headers,
    params: { mes: MES, anio: ANIO, fresh: 1, _t: Date.now() },
  })
  expect(r.ok(), await r.text()).toBeTruthy()
  return r.json()
}

test.describe('Compartido — perfiles de familia', () => {
  test('por defecto el receptor ve solo los gastos de la cuenta principal', async ({ request }) => {
    const { BETO, conexion, dePeque, deAna } = await escenario(request)
    const v = await vista(request, BETO, conexion.id)
    const ids = v.detalle.map((g) => g.id)
    expect(ids).toContain(deAna.id)
    expect(ids).not.toContain(dePeque.id)
    expect(v.detalle.find((g) => g.id === deAna.id).deQuien ?? null).toBeNull()
  })

  test('al incluir el perfil, sus gastos aparecen y dicen de quién son', async ({ request }) => {
    const { ANA, BETO, conexion, perfil, dePeque, deAna } = await escenario(request)
    const r = await request.put(`/api/compartido/conexiones/${conexion.id}/alcance`, {
      headers: ANA,
      data: { perfiles: [perfil.id] },
    })
    expect(r.ok(), await r.text()).toBeTruthy()
    const dto = await r.json()
    expect(dto.perfiles.map((p) => p.id)).toEqual([perfil.id])

    const v = await vista(request, BETO, conexion.id)
    const ids = v.detalle.map((g) => g.id)
    expect(ids).toContain(deAna.id)
    expect(ids).toContain(dePeque.id)
    expect(v.detalle.find((g) => g.id === dePeque.id).deQuien).toBe(`Peque ${sufijo}`)
    // El total del rubro suma los dos.
    const fila = v.categorias?.find((c) => c.categoriaId === conexion.categorias?.[0]?.categoriaId)
    if (fila) expect(fila.consumido).toBeGreaterThanOrEqual(44)

    // El receptor ve en su lista de conexiones a quién incluye.
    const lista = await (await request.get('/api/compartido/conexiones', { headers: BETO })).json()
    const mia = lista.meComparten.find((c) => c.id === conexion.id)
    expect(mia.perfiles.map((p) => p.nombre)).toEqual([`Peque ${sufijo}`])

    // Quitar el perfil deja de mostrar sus gastos y deja un evento de sistema.
    await request.put(`/api/compartido/conexiones/${conexion.id}/alcance`, {
      headers: ANA,
      data: { perfiles: [] },
    })
    const v2 = await vista(request, BETO, conexion.id)
    expect(v2.detalle.map((g) => g.id)).not.toContain(dePeque.id)
    const avisos = await (
      await request.get('/api/compartido/avisos', {
        headers: BETO,
        params: { conexionId: conexion.id, _t: Date.now() },
      })
    ).json()
    const textos = JSON.stringify(avisos)
    expect(textos).toContain('Empezó a incluir los gastos de')
    expect(textos).toContain('Dejó de incluir los gastos de')
  })

  test('un perfil ajeno o el receptor no pueden tocar la lista', async ({ request }) => {
    const { ANA, BETO, conexion, perfil } = await escenario(request)
    const { BETO: OTRO } = identidades()
    const ajeno = await (
      await request.post('/api/perfiles', { headers: OTRO, data: { nombre: `Ajeno ${sufijo}` } })
    ).json()
    expect(
      (
        await request.put(`/api/compartido/conexiones/${conexion.id}/alcance`, {
          headers: ANA,
          data: { perfiles: [ajeno.id] },
        })
      ).status(),
    ).toBe(400)
    expect(
      (
        await request.put(`/api/compartido/conexiones/${conexion.id}/alcance`, {
          headers: BETO,
          data: { perfiles: [perfil.id] },
        })
      ).status(),
    ).toBe(403)
    expect(
      (
        await request.put(`/api/compartido/conexiones/${conexion.id}/alcance`, {
          headers: ANA,
          data: { perfiles: ['no-es-uuid'] },
        })
      ).status(),
    ).toBe(400)
  })
})
