// POM del bottom-sheet FormDeuda.

import { DEUDAS, SHARED } from '../../helpers/selectors.js'

export class FormDeudaModal {
  constructor(page) {
    this.page = page
    this.root = page.getByTestId(SHARED.BOTTOM_SHEET).last()
  }

  async esperar() {
    await this.root.waitFor({ state: 'visible', timeout: 5000 })
  }

  inputPersona() {
    return this.root.getByTestId(DEUDAS.INPUT_PERSONA)
  }
  inputConcepto() {
    return this.root.getByTestId(DEUDAS.INPUT_CONCEPTO)
  }
  inputMonto() {
    return this.root.getByTestId(DEUDAS.INPUT_MONTO)
  }
  inputFecha() {
    return this.root.getByTestId(DEUDAS.INPUT_FECHA)
  }
  btnGuardar() {
    return this.root.getByTestId(DEUDAS.BTN_GUARDAR_DEUDA)
  }

  /**
   * El "tipo deuda" es un par de botones toggle (Me debe / Yo debo), no <select>.
   */
  async seleccionarTipo(tipo) {
    // tipo: 'me_deben' o 'yo_debo'
    const label = tipo === 'me_deben' ? /me debe/i : /yo debo/i
    await this.root.getByRole('button', { name: label }).first().click()
  }

  async crearDeuda({ tipo, persona, concepto, monto, fecha } = {}) {
    if (tipo) await this.seleccionarTipo(tipo)
    if (persona !== undefined) await this.inputPersona().fill(String(persona))
    if (concepto !== undefined) await this.inputConcepto().fill(String(concepto))
    if (monto !== undefined) await this.inputMonto().fill(String(monto))
    if (fecha !== undefined) {
      const inputFecha = this.inputFecha()
      if (await inputFecha.isVisible().catch(() => false)) {
        await inputFecha.fill(fecha)
      }
    }
    await this.btnGuardar().click()
  }

  async esperarCerrado() {
    await this.root.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }
}
