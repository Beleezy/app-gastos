// Fixture que mockea los endpoints de LLM (voz/foto) para que los tests E2E
// no consuman cuota real de Gemini ni dependan de su disponibilidad.
//
// Uso:
//   import { test } from '../fixtures/llm-mock.fixture.js'
//   test('mi test', async ({ page, llmMock }) => { ... })
//
// Cada test puede sobrescribir las respuestas con `llmMock.setVoz(...)` /
// `llmMock.setFoto(...)` antes de gatillar el flujo.

import { test as base, expect } from '@playwright/test'

const RESPUESTA_VOZ_DEFAULT = {
  gastos: [
    {
      concepto: 'Almuerzo de prueba',
      monto: 25.5,
      categoria: 'Comida',
      fecha: new Date().toISOString().slice(0, 10),
    },
  ],
}

const RESPUESTA_FOTO_DEFAULT = {
  gastos: [
    {
      concepto: 'Pan',
      monto: 3.0,
      categoria: 'Comida',
      fecha: new Date().toISOString().slice(0, 10),
    },
    {
      concepto: 'Leche',
      monto: 4.5,
      categoria: 'Comida',
      fecha: new Date().toISOString().slice(0, 10),
    },
  ],
}

export const test = base.extend({
  llmMock: async ({ page }, use) => {
    let respuestaVoz = RESPUESTA_VOZ_DEFAULT
    let respuestaFoto = RESPUESTA_FOTO_DEFAULT

    await page.route('**/api/voz/parse', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(respuestaVoz),
      })
    })

    await page.route('**/api/voz/parse-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(respuestaFoto),
      })
    })

    await use({
      setVoz: (data) => { respuestaVoz = data },
      setFoto: (data) => { respuestaFoto = data },
      reset: () => {
        respuestaVoz = RESPUESTA_VOZ_DEFAULT
        respuestaFoto = RESPUESTA_FOTO_DEFAULT
      },
    })
  },
})

export { expect }
