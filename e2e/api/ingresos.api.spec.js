// E2E del módulo Ingresos.
//
// Foco: el CRUD de `PUT /api/ingresos/:id`, que estuvo devolviendo 404
// siempre porque `actualizarIngreso` llamaba a `assertOwner` con la firma
// equivocada (tabla Drizzle en vez de la fila cargada). La pertenencia la
// garantiza el `.where()` del UPDATE — estos tests fijan ambas mitades:
// que el update propio funcione y que el ajeno/inexistente/borrado siga en 404.
//
// Requiere DEV_AUTH_BYPASS=1 + DEV_AUTH_TOKEN compartido.

import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { fixtures } from '../fixtures.js'

// Segundo usuario sembrado por `npm run db:seed:temp-users`. Solo sirve para
// el test de IDOR; si no hay token de bypass en el entorno, ese test se salta.
const DEV_TOKEN = process.env.DEV_AUTH_TOKEN
const OTRO_USER_ID = '00000000-0000-0000-0000-000000000102'
const headersOtroUsuario = {
  'x-dev-auth-token': DEV_TOKEN || '',
  'x-dev-user-id': OTRO_USER_ID,
  'x-dev-user-email': 'demo2@test.local',
}

async function crearIngreso(request, data = {}, options = {}) {
  const r = await request.post('/api/ingresos', {
    data: { ...fixtures.ingreso, ...data },
    ...options,
  })
  expect(r.ok()).toBeTruthy()
  return r.json()
}

test.describe('Ingresos', () => {
  test('API: crear ingreso válido', async ({ request }) => {
    const ingreso = await crearIngreso(request, { concepto: 'Sueldo E2E crear' })
    expect(ingreso.id).toBeDefined()
    expect(ingreso.concepto).toBe('Sueldo E2E crear')
    expect(ingreso.monto).toBe(1200)

    await request.delete(`/api/ingresos/${ingreso.id}`).catch(() => {})
  })

  test('API: editar ingreso propio devuelve 200 con los cambios aplicados', async ({ request }) => {
    const ingreso = await crearIngreso(request, { concepto: 'Sueldo E2E editar' })

    const r = await request.put(`/api/ingresos/${ingreso.id}`, {
      data: { concepto: 'Sueldo E2E editado', monto: 1500, origen: 'freelance' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(200)

    const actualizado = await r.json()
    expect(actualizado.id).toBe(ingreso.id)
    expect(actualizado.concepto).toBe('Sueldo E2E editado')
    expect(actualizado.monto).toBe(1500)
    expect(actualizado.origen).toBe('freelance')
    // Los campos no enviados no se tocan.
    expect(actualizado.fecha).toBe(ingreso.fecha)

    // Y el cambio persiste, no solo viene en la respuesta del UPDATE.
    const lista = await request.get('/api/ingresos?mes=4&anio=2026')
    expect(lista.ok()).toBeTruthy()
    const persistido = (await lista.json()).find((i) => i.id === ingreso.id)
    expect(persistido?.concepto).toBe('Sueldo E2E editado')
    expect(persistido?.monto).toBe(1500)

    await request.delete(`/api/ingresos/${ingreso.id}`).catch(() => {})
  })

  test('API: editar ingreso inexistente devuelve 404', async ({ request }) => {
    const r = await request.put(`/api/ingresos/${randomUUID()}`, {
      data: { concepto: 'No existe' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(404)
  })

  test('API: editar ingreso de otro usuario devuelve 404 (IDOR)', async ({ request }) => {
    test.skip(!DEV_TOKEN, 'Sin DEV_AUTH_TOKEN no se puede simular un segundo usuario')

    const ajeno = await crearIngreso(
      request,
      { concepto: 'Sueldo ajeno E2E' },
      { headers: headersOtroUsuario },
    )

    const r = await request.put(`/api/ingresos/${ajeno.id}`, {
      data: { concepto: 'Secuestrado' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(404)

    // Y sigue intacto para su dueño.
    const lista = await request.get('/api/ingresos?mes=4&anio=2026', {
      headers: headersOtroUsuario,
    })
    const persistido = (await lista.json()).find((i) => i.id === ajeno.id)
    expect(persistido?.concepto).toBe('Sueldo ajeno E2E')

    await request
      .delete(`/api/ingresos/${ajeno.id}`, { headers: headersOtroUsuario })
      .catch(() => {})
  })

  test('API: editar ingreso en papelera devuelve 404', async ({ request }) => {
    const ingreso = await crearIngreso(request, { concepto: 'Sueldo E2E papelera' })

    const del = await request.delete(`/api/ingresos/${ingreso.id}`)
    expect(del.ok()).toBeTruthy()

    const r = await request.put(`/api/ingresos/${ingreso.id}`, {
      data: { concepto: 'Revivido' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(404)
  })

  test('API: un PUT parcial no borra el flag esRecurrente', async ({ request }) => {
    const ingreso = await crearIngreso(request, {
      concepto: 'Sueldo E2E recurrente',
      esRecurrente: true,
    })
    expect(ingreso.esRecurrente).toBe(true)

    // Solo el concepto. Los `.default()` del schema se colaban por `.partial()`
    // y llegaban al service como `esRecurrente: false`, apagando el flag.
    const r = await request.put(`/api/ingresos/${ingreso.id}`, {
      data: { concepto: 'Sueldo E2E recurrente editado' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(200)

    const actualizado = await r.json()
    expect(actualizado.concepto).toBe('Sueldo E2E recurrente editado')
    expect(actualizado.esRecurrente).toBe(true)

    await request.delete(`/api/ingresos/${ingreso.id}`).catch(() => {})
  })

  test('API: PUT sin ningún campo devuelve 400 (Sin cambios)', async ({ request }) => {
    const ingreso = await crearIngreso(request, { concepto: 'Sueldo E2E sin cambios' })

    const r = await request.put(`/api/ingresos/${ingreso.id}`, {
      data: {},
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(400)

    await request.delete(`/api/ingresos/${ingreso.id}`).catch(() => {})
  })

  test('API: rechaza ingreso sin concepto (Zod)', async ({ request }) => {
    const r = await request.post('/api/ingresos', {
      data: { ...fixtures.ingreso, concepto: '' },
      failOnStatusCode: false,
    })
    expect(r.status()).toBe(400)
  })
})
