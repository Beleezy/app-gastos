// E2E UI del flujo de registro por voz, con LLM mockeado y stub de Web Speech.

import { test, expect } from '../fixtures/index.js'
import { RegistroPage } from '../pages/RegistroPage.js'
import { REGISTRO } from '../helpers/selectors.js'

test.describe('Registro por voz — UI', () => {
  test.beforeEach(async ({ page }) => {
    // Stub de SpeechRecognition (no funciona en Chromium headless).
    await page.addInitScript(() => {
      class FakeRecognition {
        constructor() {
          this.continuous = false
          this.interimResults = false
          this.lang = 'es-PE'
          this.onresult = null
          this.onerror = null
          this.onend = null
          this.onstart = null
        }
        start() {
          setTimeout(() => {
            this.onstart && this.onstart()
            const transcript = window.__e2eTranscript || 'almuerzo 25 soles'
            const event = {
              results: [[{ transcript, confidence: 0.95 }]],
              resultIndex: 0,
            }
            // Marcamos como final
            event.results[0].isFinal = true
            this.onresult && this.onresult(event)
            setTimeout(() => this.onend && this.onend(), 10)
          }, 30)
        }
        stop() {
          this.onend && this.onend()
        }
        abort() {
          this.onend && this.onend()
        }
      }
      window.SpeechRecognition = FakeRecognition
      window.webkitSpeechRecognition = FakeRecognition
    })
  })

  test('mock LLM: la transcripcion abre la confirmacion con el item parseado', async ({
    page,
    llmMock,
  }) => {
    llmMock.setVoz({
      gastos: [
        {
          concepto: 'Almuerzo dictado',
          monto: 25,
          categoria: 'Comida',
          fecha: new Date().toISOString().slice(0, 10),
        },
      ],
    })

    const registro = new RegistroPage(page)
    await registro.goto()

    await registro.dictarTranscripcion('almuerzo 25 soles')
    // SpeechRecognition.onend deja la transcripcion como draft ("Borrador
    // guardado"). El draft tiene un boton "Enviar" que dispara el parse al LLM.
    await page.getByTestId('btn-draft-enviar').click({ timeout: 10_000 })

    const confirmacion = page.getByTestId(REGISTRO.CONFIRMACION_VOZ)
    await expect(confirmacion).toBeVisible({ timeout: 10_000 })
    await expect(confirmacion).toContainText('Almuerzo dictado')
  })

  test('descartar oculta la confirmacion sin persistir', async ({ page, llmMock, request }) => {
    const concepto = 'GastoDescartado E2E'
    llmMock.setVoz({
      gastos: [
        { concepto, monto: 10, categoria: 'Otros', fecha: new Date().toISOString().slice(0, 10) },
      ],
    })

    const registro = new RegistroPage(page)
    await registro.goto()
    await registro.dictarTranscripcion('algo')
    await page.getByTestId('btn-draft-enviar').click({ timeout: 10_000 })

    const confirmacion = page.getByTestId(REGISTRO.CONFIRMACION_VOZ)
    await expect(confirmacion).toBeVisible({ timeout: 10_000 })

    await page.getByTestId(REGISTRO.BTN_DESCARTAR_VOZ).click()
    await expect(confirmacion).toBeHidden({ timeout: 5000 })

    // Verifica que NO se creo el gasto
    const r = await request.get('/api/gastos')
    const data = await r.json()
    const lista = Array.isArray(data) ? data : data?.gastos || []
    expect(lista.find((g) => g.concepto === concepto)).toBeUndefined()
  })
})
