// POM del bottom-sheet FormRegistrarPago (al marcar planificado como pagado).

import { PLANIFICADOR, SHARED } from '../../helpers/selectors.js'

export class FormRegistrarPagoModal {
  constructor(page) {
    this.page = page
    this.root = page.getByTestId(SHARED.BOTTOM_SHEET).last()
  }

  async esperar() {
    await this.root.waitFor({ state: 'visible', timeout: 5000 })
  }

  inputFechaPago() { return this.root.getByTestId(PLANIFICADOR.INPUT_FECHA_PAGO) }
  inputNotasPago() { return this.root.getByTestId(PLANIFICADOR.INPUT_NOTAS_PAGO) }
  btnConfirmar() { return this.root.getByTestId(PLANIFICADOR.BTN_CONFIRMAR_PAGO) }

  async registrar({ fecha, notas } = {}) {
    if (fecha !== undefined) {
      const inputFecha = this.inputFechaPago()
      if (await inputFecha.isVisible().catch(() => false)) {
        await inputFecha.fill(fecha)
      }
    }
    if (notas !== undefined) {
      const inputNotas = this.inputNotasPago()
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
