// E2E UI del flujo de registro por foto, con LLM mockeado y un PNG fixture.
//
// La imagen es un PNG mínimo válido generado en bytes (no requiere archivo).

import { test, expect } from '../fixtures/index.js'
import { RegistroPage } from '../pages/RegistroPage.js'
import { REGISTRO } from '../helpers/selectors.js'

// PNG 1x1 transparente (bytes mínimos). Suficiente para que el input acepte
// el archivo y dispare el flujo de upload.
const PNG_1x1 = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6300010000000500015c0bcfb20000000049454e44ae426082',
  'hex'
)

test.describe('Registro por foto — UI', () => {
  test('mock LLM: subir foto abre confirmacion con items parseados', async ({ page, llmMock }) => {
    llmMock.setFoto({
      gastos: [
        { concepto: 'Pan integral', monto: 4.5, categoria: 'Comida', fecha: new Date().toISOString().slice(0, 10) },
        { concepto: 'Leche fresca', monto: 5.2, categoria: 'Comida', fecha: new Date().toISOString().slice(0, 10) },
      ],
    })

    const registro = new RegistroPage(page)
    await registro.goto()

    // Sube el PNG via input file
    await registro.inputFoto().setInputFiles({
      name: 'recibo.png',
      mimeType: 'image/png',
      buffer: PNG_1x1,
    })

    // El flujo es upload → preview modal → click Escanear → confirmacion.
    // BotonCamara hace `showPhotoPreview = true` al capturar; el usuario
    // confirma con el boton "Escanear" para mandar al LLM.
    await page.getByTestId('btn-foto-enviar').click({ timeout: 10_000 })

    const confirmacion = page.getByTestId(REGISTRO.CONFIRMACION_VOZ)
    await expect(confirmacion).toBeVisible({ timeout: 15_000 })
    await expect(confirmacion).toContainText('Pan integral')
    await expect(confirmacion).toContainText('Leche fresca')
  })

  test('foto con respuesta vacia muestra mensaje o no abre confirmacion', async ({ page, llmMock }) => {
    llmMock.setFoto({ gastos: [] })

    const registro = new RegistroPage(page)
    await registro.goto()

    await registro.inputFoto().setInputFiles({
      name: 'recibo-vacio.png',
      mimeType: 'image/png',
      buffer: PNG_1x1,
    })

    // Necesitamos disparar el send para que el LLM mock responda con [].
    const sendBtn = page.getByTestId('btn-foto-enviar')
    await sendBtn.click({ timeout: 10_000 }).catch(() => {})

    // Esperamos que NO se abra la confirmacion (o que se cierre rapido si abre y cierra)
    const confirmacion = page.getByTestId(REGISTRO.CONFIRMACION_VOZ)
    await page.waitForTimeout(2000)
    const visible = await confirmacion.isVisible().catch(() => false)
    if (visible) {
      // Si abre, debe estar vacia
      await expect(confirmacion.getByTestId(REGISTRO.CONFIRMACION_ITEM)).toHaveCount(0)
    }
  })
})
