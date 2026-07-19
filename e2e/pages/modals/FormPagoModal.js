// POM del bottom-sheet FormPago (registrar pago de una deuda).

import { DEUDAS, SHARED } from '../../helpers/selectors.js'

export class FormPagoModal {
  constructor(page) {
    this.page = page
    this.root = page.getByTestId(SHARED.BOTTOM_SHEET).last()
  }

  async esperar() {
    await this.root.waitFor({ state: 'visible', timeout: 5000 })
  }

  inputMonto() {
    return this.root.getByTestId(DEUDAS.INPUT_MONTO_PAGO)
  }
  inputFecha() {
    return this.root.getByTestId(DEUDAS.INPUT_FECHA_PAGO)
  }
  inputNotas() {
    return this.root.getByTestId(DEUDAS.INPUT_NOTAS_PAGO)
  }
  btnConfirmar() {
    return this.root.getByTestId(DEUDAS.BTN_CONFIRMAR_PAGO)
  }

  async registrarPago({ monto, fecha, notas } = {}) {
    if (monto !== undefined) await this.inputMonto().fill(String(monto))
    if (fecha !== undefined) {
      const inputFecha = this.inputFecha()
      if (await inputFecha.isVisible().catch(() => false)) {
        await inputFecha.fill(fecha)
      }
    }
    if (notas !== undefined) {
      const inputNotas = this.inputNotas()
      if (await inputNotas.isVisible().catch(() => false)) {
        await inputNotas.fill(notas)
      }
    }
    await this.btnConfirmar().click()
  }

  async esperarCerrado() {
    await this.root.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }
}
