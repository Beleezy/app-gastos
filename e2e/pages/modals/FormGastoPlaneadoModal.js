// POM del bottom-sheet de FormGastoPlaneado.

import { PLANIFICADOR, SHARED } from '../../helpers/selectors.js'

export class FormGastoPlaneadoModal {
  constructor(page) {
    this.page = page
    this.root = page.getByTestId(SHARED.BOTTOM_SHEET).last()
  }

  async esperar() {
    await this.root.waitFor({ state: 'visible', timeout: 5000 })
  }

  inputConcepto() { return this.root.getByTestId(PLANIFICADOR.INPUT_CONCEPTO) }
  inputMonto() { return this.root.getByTestId(PLANIFICADOR.INPUT_MONTO) }
  inputNotas() { return this.root.getByTestId(PLANIFICADOR.INPUT_NOTAS) }
  btnGuardar() { return this.root.getByTestId(PLANIFICADOR.BTN_GUARDAR) }

  async seleccionarCategoria(nombre) {
    const opciones = this.root.getByRole('button', { name: nombre, exact: false })
    await opciones.first().click({ timeout: 5000 })
  }

  /**
   * El selector de fecha es un day-picker custom (botones por dia).
   * Selecciona el dia indicado dentro del mes mostrado.
   */
  async seleccionarDia(dia) {
    const num = String(dia)
    const btn = this.root.getByRole('button', { name: new RegExp(`^${num}$`) })
    await btn.first().click({ timeout: 5000 })
  }

  /**
   * La recurrencia es un toggle (form.esRecurrente). Activa o desactiva.
   */
  async toggleRecurrente(activar = true) {
    const btn = this.root.getByRole('button', { name: /recurrente/i })
    if (await btn.isVisible().catch(() => false)) {
      const aria = await btn.getAttribute('aria-pressed').catch(() => null)
      const pressed = aria === 'true'
      if (pressed !== activar) await btn.click()
    }
  }

  async crearPlanificado({ concepto, monto, dia, categoria, notas, recurrente } = {}) {
    if (concepto !== undefined) await this.inputConcepto().fill(String(concepto))
    if (monto !== undefined) await this.inputMonto().fill(String(monto))
    if (dia !== undefined) await this.seleccionarDia(dia)
    if (categoria) await this.seleccionarCategoria(categoria)
    if (notas !== undefined) {
      const inputNotas = this.inputNotas()
      if (await inputNotas.isVisible().catch(() => false)) {
        await inputNotas.fill(notas)
      }
    }
    if (recurrente !== undefined) await this.toggleRecurrente(recurrente)
    await this.btnGuardar().click()
  }

  async esperarCerrado() {
    await this.root.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }
}
