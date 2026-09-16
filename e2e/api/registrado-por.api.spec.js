// Quién anotó cada gasto (gastos.registrado_por_id).
//
// Con un perfil de familia activo (cookie perfil-activo) el dueño de la
// fila es el perfil y quien escribe es la cuenta real. El historial devuelve
// `registradoPorNombre` solo cuando difieren.

import { test, expect } from '@playwright/test'
import { fechaEnZona } from '../fechaNegocio.js'

const marca = Date.now()

// Una predefinida global: vale para cualquier cuenta y cualquier perfil.
async function categoriaId(request) {
  const cats = await (await request.get('/api/categorias')).json()
  return (cats.find((c) => c.esPredefinida && !c.usuarioId) || cats[0])?.id
}

test.describe('Registrado por (perfiles de familia)', () => {
  test('un gasto anotado por la cuenta real para un perfil dice quién lo anotó', async ({
    request,
  }) => {
    const catId = await categoriaId(request)
    test.skip(!catId, 'Sin categorías sembradas')
    const perfil = await (
      await request.post('/api/perfiles', { data: { nombre: `Peque ${marca}` } })
    ).json()
    expect(perfil.id).toBeTruthy()
    const cookie = `perfil-activo=${perfil.id}`
    const fecha = fechaEnZona(new Date(), 'America/Lima')

    const creado = await request.post('/api/gastos', {
      headers: { cookie },
      data: { concepto: `Helado ${marca}`, monto: 3.5, categoriaId: catId, fecha },
    })
    expect(creado.ok(), await creado.text()).toBeTruthy()
    const gasto = await creado.json()

    // En el historial DEL PERFIL aparece con el nombre de la cuenta real.
    const lista = await (
      await request.get('/api/gastos', { headers: { cookie }, params: { fecha, _t: marca } })
    ).json()
    const mio = lista.find((g) => g.id === gasto.id)
    expect(mio).toBeTruthy()
    expect(mio.registradoPorNombre).toBe('Usuario Demo 1')

    // Un gasto propio (sin perfil) no lleva la marca: quien anota es el dueño.
    const propio = await (
      await request.post('/api/gastos', {
        data: { concepto: `Propio ${marca}`, monto: 1, categoriaId: catId, fecha },
      })
    ).json()
    const listaPropia = await (
      await request.get('/api/gastos', { params: { fecha, _t: marca + 1 } })
    ).json()
    expect(listaPropia.find((g) => g.id === propio.id)?.registradoPorNombre ?? null).toBeNull()

    // El gasto del perfil no aparece en el historial de la cuenta real.
    expect(listaPropia.find((g) => g.id === gasto.id)).toBeUndefined()

    await request.delete(`/api/gastos/${propio.id}`)
    await request.delete(`/api/perfiles/${perfil.id}`)
  })

  test('un perfil puede anotar en una categoría personalizada de la familia', async ({
    request,
  }) => {
    // Las categorías son de la cuenta real (ruta sin perfil); el perfil las
    // ve en el selector y antes el POST se las rechazaba con 400.
    const cat = await (
      await request.post('/api/categorias', {
        data: { nombre: `Familia ${marca}`, icono: '🍼', color: '#336699' },
      })
    ).json()
    expect(cat.id).toBeTruthy()
    const perfil = await (
      await request.post('/api/perfiles', { data: { nombre: `Cat ${marca}` } })
    ).json()
    const cookie = `perfil-activo=${perfil.id}`
    const fecha = fechaEnZona(new Date(), 'America/Lima')
    const r = await request.post('/api/gastos', {
      headers: { cookie },
      data: { concepto: `Pañales ${marca}`, monto: 20, categoriaId: cat.id, fecha },
    })
    expect(r.ok(), await r.text()).toBeTruthy()
    const g = await r.json()
    expect(g.categoriaNombre).toBe(`Familia ${marca}`)
    // Y en su historial la categoría se lee con nombre, no como "sin categoría".
    const lista = await (
      await request.get('/api/gastos', { headers: { cookie }, params: { fecha, _t: marca + 3 } })
    ).json()
    expect(lista.find((x) => x.id === g.id)?.categoriaNombre).toBe(`Familia ${marca}`)
    await request.delete(`/api/perfiles/${perfil.id}`)
    await request.delete(`/api/categorias/${cat.id}`)
  })

  test('el registro en lote también anota quién lo hizo', async ({ request }) => {
    const catId = await categoriaId(request)
    test.skip(!catId, 'Sin categorías sembradas')
    const perfil = await (
      await request.post('/api/perfiles', { data: { nombre: `Lote ${marca}` } })
    ).json()
    const cookie = `perfil-activo=${perfil.id}`
    const fecha = fechaEnZona(new Date(), 'America/Lima')
    const r = await request.post('/api/gastos/bulk', {
      headers: { cookie },
      data: {
        metodoRegistro: 'manual',
        gastos: [{ concepto: `Pan ${marca}`, monto: 2, categoriaId: catId, fecha }],
      },
    })
    expect(r.ok(), await r.text()).toBeTruthy()
    const [g] = await r.json()
    const lista = await (
      await request.get('/api/gastos', { headers: { cookie }, params: { fecha, _t: marca + 2 } })
    ).json()
    expect(lista.find((x) => x.id === g.id)?.registradoPorNombre).toBe('Usuario Demo 1')
    await request.delete(`/api/perfiles/${perfil.id}`)
  })
})
