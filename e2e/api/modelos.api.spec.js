// Catálogo de modelos de IA (/api/superadmin/modelos, tabla modelos_llm).
//
// El superadmin de pruebas lo siembra db:seed:temp-users (rol
// 'superadmin'); el bypass E2E respeta el rol de la fila. El descubrimiento
// contra Google no se ejercita aquí (no hay GEMINI_API_KEY en CI): se
// comprueba que sin clave responde 503 con mensaje y no 500.

import { test, expect } from '@playwright/test'

const TOKEN = process.env.DEV_AUTH_TOKEN || 'dev-token'
const SUPER = {
  'x-dev-auth-token': TOKEN,
  'x-dev-user-id': '00000000-0000-0000-0000-000000000103',
  'x-dev-user-email': 'superadmin@test.local',
}
const NORMAL = {
  'x-dev-auth-token': TOKEN,
  'x-dev-user-id': '00000000-0000-0000-0000-000000000102',
  'x-dev-user-email': 'demo2@test.local',
}
const nombreUnico = () => `gemini-9.${Date.now() % 100000}-flash-e2e`

test.describe('Modelos de IA — superadmin', () => {
  test('un usuario normal no ve ni toca el catálogo', async ({ request }) => {
    expect((await request.get('/api/superadmin/modelos', { headers: NORMAL })).status()).toBe(403)
    expect(
      (
        await request.post('/api/superadmin/modelos', {
          headers: NORMAL,
          data: { nombre: nombreUnico() },
        })
      ).status(),
    ).toBe(403)
    expect(
      (await request.post('/api/superadmin/modelos/descubrir', { headers: NORMAL })).status(),
    ).toBe(403)
  })

  test('el catálogo arranca sembrado y ordenado por prioridad', async ({ request }) => {
    const r = await request.get('/api/superadmin/modelos', { headers: SUPER })
    expect(r.status()).toBe(200)
    const data = await r.json()
    expect(Array.isArray(data.modelos)).toBe(true)
    expect(data.modelos.length).toBeGreaterThanOrEqual(1)
    expect(data.maxFallos).toBeGreaterThan(0)
    const prioridades = data.modelos.map((m) => m.prioridad)
    expect(prioridades).toEqual([...prioridades].sort((a, b) => a - b))
    // La respuesta no expone nada más que el catálogo.
    expect(data.modelos[0]).toHaveProperty('nombre')
    expect(data.modelos[0]).toHaveProperty('activo')
  })

  test('alta manual, apagar/encender, prioridad y baja', async ({ request }) => {
    const nombre = nombreUnico()
    const creado = await request.post('/api/superadmin/modelos', {
      headers: SUPER,
      data: { nombre: `models/${nombre}` }, // el prefijo se normaliza
    })
    expect(creado.status()).toBe(201)
    const fila = await creado.json()
    expect(fila.nombre).toBe(nombre)
    expect(fila.origen).toBe('manual')
    expect(fila.activo).toBe(true)

    // Duplicado → 409, no 500 por la UNIQUE.
    expect(
      (
        await request.post('/api/superadmin/modelos', { headers: SUPER, data: { nombre } })
      ).status(),
    ).toBe(409)

    const apagado = await request.patch(`/api/superadmin/modelos/${fila.id}`, {
      headers: SUPER,
      data: { activo: false, prioridad: 7 },
    })
    expect(apagado.status()).toBe(200)
    const filaApagada = await apagado.json()
    expect(filaApagada.activo).toBe(false)
    expect(filaApagada.prioridad).toBe(7)

    // Encender a mano resetea la marca automática y el contador.
    const encendido = await (
      await request.patch(`/api/superadmin/modelos/${fila.id}`, {
        headers: SUPER,
        data: { activo: true },
      })
    ).json()
    expect(encendido.activo).toBe(true)
    expect(encendido.desactivadoAuto).toBe(false)
    expect(encendido.fallosConsecutivos).toBe(0)

    const borrado = await request.delete(`/api/superadmin/modelos/${fila.id}`, { headers: SUPER })
    expect(borrado.status()).toBe(200)
    expect(
      (await request.delete(`/api/superadmin/modelos/${fila.id}`, { headers: SUPER })).status(),
    ).toBe(404)
  })

  test('cuerpos y parámetros inválidos responden 400, no 500', async ({ request }) => {
    for (const data of [
      {},
      { nombre: '' },
      { nombre: 'con espacios' },
      { nombre: 'MAYUS' },
      null,
    ]) {
      const r = await request.post('/api/superadmin/modelos', { headers: SUPER, data })
      expect(r.status(), JSON.stringify(data)).toBe(400)
    }
    // Un id que no es uuid es "no encontrado" (getUuidParam), nunca un 500.
    expect(
      (
        await request.patch('/api/superadmin/modelos/no-es-uuid', {
          headers: SUPER,
          data: { activo: false },
        })
      ).status(),
    ).toBe(404)
    expect(
      (
        await request.patch('/api/superadmin/modelos/00000000-0000-0000-0000-000000000999', {
          headers: SUPER,
          data: { prioridad: 5000 },
        })
      ).status(),
    ).toBe(400)
    expect(
      (
        await request.patch('/api/superadmin/modelos/00000000-0000-0000-0000-000000000999', {
          headers: SUPER,
          data: {},
        })
      ).status(),
    ).toBe(400)
  })

  test('descubrir sin GEMINI_API_KEY responde 503 con explicación', async ({ request }) => {
    test.skip(!!process.env.GEMINI_API_KEY, 'Hay clave: el descubrimiento sí saldría a Google')
    const r = await request.post('/api/superadmin/modelos/descubrir', { headers: SUPER })
    expect(r.status()).toBe(503)
    expect((await r.json()).message).toContain('GEMINI_API_KEY')
  })

  test('el cron de descubrimiento exige el secreto y sin clave se omite en 200', async ({
    request,
  }) => {
    expect((await request.post('/api/cron/descubrir-modelos')).status()).toBe(401)
    test.skip(
      !process.env.CRON_SECRET || !!process.env.GEMINI_API_KEY,
      'Sin CRON_SECRET o con clave',
    )
    const r = await request.post('/api/cron/descubrir-modelos', {
      headers: { 'x-cron-secret': process.env.CRON_SECRET },
    })
    expect(r.status()).toBe(200)
    expect((await r.json()).omitido).toBe(true)
  })
})
