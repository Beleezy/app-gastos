// POM del bottom-sheet FormPagoGlobal (distribucion sobre varias deudas).
// Nota: la distribucion es server-side, no hay checkboxes interactivos de
// seleccion — solo un input de monto y boton distribuir.

import { DEUDAS, SHARED } from '../../helpers/selectors.js'

export class FormPagoGlobalModal {
  constructor(page) {
    this.page = page
    this.root = page.getByTestId(SHARED.BOTTOM_SHEET).last()
  }

  async esperar() {
    await this.root.waitFor({ state: 'visible', timeout: 5000 })
  }

  inputMonto() {
    return this.root.getByTestId(DEUDAS.INPUT_MONTO_GLOBAL)
  }
  btnDistribuir() {
    return this.root.getByTestId(DEUDAS.BTN_DISTRIBUIR)
  }

  async distribuir({ monto } = {}) {
    if (monto !== undefined) await this.inputMonto().fill(String(monto))
    await this.btnDistribuir().click()
  }

  async esperarCerrado() {
    await this.root.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }
}
