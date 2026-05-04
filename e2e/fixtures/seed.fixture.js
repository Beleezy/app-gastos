// Fixture que provee un "tracker" de entidades creadas durante el test
// para que se limpien automaticamente al final, sin afectar al seed
// determinista cargado por el workflow CI.
//
// Uso:
//   import { test } from '../fixtures/seed.fixture.js'
//   test('mi test', async ({ page, request, tracker }) => {
//     const r = await request.post('/api/gastos', { data: {...} })
//     const gasto = await r.json()
//     tracker.gastos.push(gasto.id)
//     // ... test ...
//   })
// Al final del test, todas las entidades se borran automaticamente.

import { test as base, expect } from '@playwright/test'
import {
  cleanupGastos,
  cleanupDeudas,
  cleanupGastosPlanificados,
  cleanupCategorias,
} from '../helpers/db.js'

export const test = base.extend({
  tracker: async ({ request }, use) => {
    const tracker = {
      gastos: [],
      deudas: [],
      planificados: [],
      categorias: [],
    }
    await use(tracker)
    // Cleanup en orden inverso (planificados antes que gastos por FKs si aplica)
    await cleanupGastosPlanificados(request, tracker.planificados)
    await cleanupGastos(request, tracker.gastos)
    await cleanupDeudas(request, tracker.deudas)
    await cleanupCategorias(request, tracker.categorias)
  },
})

export { expect }
