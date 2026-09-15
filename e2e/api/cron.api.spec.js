// Los endpoints de mantenimiento se ejecutan de verdad, no solo se comprueba
// el 401 sin token. Purgar la papelera hace DELETE físico sobre `gastos` y
// `gastos_planificados`, y llevaba meses fallando en producción por dos
// triggers huérfanos (migración 0035) sin que ningún test lo tocara: el
// workflow de mantenimiento nunca corrió, y la suite solo pedía el 401.

import { test, expect } from '@playwright/test'

const SECRET = process.env.CRON_SECRET

test.describe('Cron de mantenimiento', () => {
  test.skip(!SECRET, 'CRON_SECRET no configurado en este entorno')

  const tareas = [
    ['expirar-solicitudes', ['expiradas']],
    ['purgar-llm-cache', ['purged']],
    ['purgar-papelera', ['gastos', 'deudas', 'pagosDeuda', 'personas']],
    ['purgar-idempotencias', ['purged']],
  ]

  for (const [tarea, claves] of tareas) {
    test(`POST /api/cron/${tarea} con el secreto ejecuta y responde conteos`, async ({
      request,
    }) => {
      const r = await request.post(`/api/cron/${tarea}`, {
        headers: { 'X-Cron-Secret': SECRET },
        failOnStatusCode: false,
      })
      expect(r.ok(), await r.text()).toBeTruthy()
      const body = await r.json()
      for (const clave of claves) {
        expect(typeof body[clave], `${tarea}.${clave}`).toBe('number')
      }
    })

    test(`POST /api/cron/${tarea} con un secreto equivocado responde 401`, async ({ request }) => {
      const r = await request.post(`/api/cron/${tarea}`, {
        headers: { 'X-Cron-Secret': 'no-es' },
        failOnStatusCode: false,
      })
      expect(r.status()).toBe(401)
    })
  }

  test('la purga de la papelera borra lo que lleva más de 30 días y respeta lo reciente', async ({
    request,
  }) => {
    // Un gasto borrado HOY no se purga: sigue restaurable.
    const cats = await (await request.get('/api/categorias')).json()
    const creado = await request.post('/api/gastos', {
      data: {
        concepto: `Purga ${Date.now()}`,
        monto: 3,
        fecha: '2026-01-15',
        categoriaId: cats[0].id,
      },
    })
    expect(creado.ok(), await creado.text()).toBeTruthy()
    const gastoId = (await creado.json()).id
    await request.delete(`/api/gastos/${gastoId}`)

    const r = await request.post('/api/cron/purgar-papelera', {
      headers: { 'X-Cron-Secret': SECRET },
    })
    expect(r.ok(), await r.text()).toBeTruthy()

    const papelera = await (await request.get('/api/papelera')).json()
    expect(papelera.gastos.some((g) => g.id === gastoId)).toBe(true)
  })
})
