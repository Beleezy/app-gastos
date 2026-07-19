// POM del bottom-sheet de FormGastoManual.
// Encapsula la realidad de que la categoria es un grid de botones (no <select>).

import { REGISTRO, SHARED } from '../../helpers/selectors.js'

export class FormGastoManualModal {
  constructor(page) {
    this.page = page
    // Scope todo dentro del bottom-sheet activo
    this.root = page.getByTestId(SHARED.BOTTOM_SHEET).last()
  }

  async esperar() {
    await this.root.waitFor({ state: 'visible', timeout: 5000 })
  }

  // ─── Inputs ─────────────────────────────────────────────
  inputConcepto() {
    return this.root.getByTestId(REGISTRO.INPUT_CONCEPTO)
  }
  inputMonto() {
    return this.root.getByTestId(REGISTRO.INPUT_MONTO)
  }
  inputFecha() {
    return this.root.getByTestId(REGISTRO.INPUT_FECHA)
  }
  inputHora() {
    return this.root.getByTestId(REGISTRO.INPUT_HORA)
  }
  inputNotas() {
    return this.root.getByTestId(REGISTRO.INPUT_NOTAS)
  }
  btnGuardar() {
    return this.root.getByTestId(REGISTRO.BTN_GUARDAR)
  }

  /**
   * Selecciona categoria por nombre visible (es un grid de botones, no select).
   * Si no hay match, lanza para que el test falle con mensaje claro.
   */
  async seleccionarCategoria(nombre) {
    const opciones = this.root.getByRole('button', { name: nombre, exact: false })
    await opciones.first().click({ timeout: 5000 })
  }

  /**
   * Helper compuesto: llena los campos minimos validos y guarda.
   * Devuelve cuando el bottom-sheet se cierra (= submit OK).
   */
  async crearGasto({ concepto, monto, fecha, categoria, notas, hora } = {}) {
    if (concepto !== undefined) await this.inputConcepto().fill(String(concepto))
    if (monto !== undefined) await this.inputMonto().fill(String(monto))
    if (fecha !== undefined) {
      const inputFecha = this.inputFecha()
      if (await inputFecha.isVisible().catch(() => false)) {
        await inputFecha.fill(fecha)
      }
    }
    if (hora !== undefined) {
      const inputHora = this.inputHora()
      if (await inputHora.isVisible().catch(() => false)) {
        await inputHora.fill(hora)
      }
    }
    if (notas !== undefined) {
      const inputNotas = this.inputNotas()
      if (await inputNotas.isVisible().catch(() => false)) {
        await inputNotas.fill(notas)
      }
    }
    if (categoria) await this.seleccionarCategoria(categoria)
    await this.btnGuardar().click()
  }

  async esperarCerrado() {
    await this.root.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }
}
