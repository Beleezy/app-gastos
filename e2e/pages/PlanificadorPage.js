// POM de /planificador.

import { BasePage } from './BasePage.js'
import { FormGastoPlaneadoModal } from './modals/FormGastoPlaneadoModal.js'
import { FormRegistrarPagoModal } from './modals/FormRegistrarPagoModal.js'
import { PLANIFICADOR } from '../helpers/selectors.js'

export class PlanificadorPage extends BasePage {
  async goto() {
    await this.page.goto('/planificador')
    await this.waitForReady()
  }

  // ─── Resumen ────────────────────────────────────────────
  resumen() { return this.page.getByTestId(PLANIFICADOR.RESUMEN) }
  montoPresupuesto() { return this.page.getByTestId(PLANIFICADOR.MONTO_PRESUPUESTO) }
  montoAsignado() { return this.page.getByTestId(PLANIFICADOR.MONTO_ASIGNADO) }
  montoSaldo() { return this.page.getByTestId(PLANIFICADOR.MONTO_SALDO) }

  // ─── Lista planificados ─────────────────────────────────
  lista() { return this.page.getByTestId(PLANIFICADOR.LISTA) }
  items() { return this.page.getByTestId(PLANIFICADOR.ITEM) }

  itemPorConcepto(texto) {
    return this.items().filter({ hasText: texto }).first()
  }

  async cantidadVisibles() {
    return this.items().count()
  }

  // ─── Acciones ───────────────────────────────────────────
  /**
   * Encuentra el primer FAB/boton que abra el FormGastoPlaneado.
   * El testid puede no existir aun; si falla, busca por rol+nombre.
   */
  async abrirFormPlaneado() {
    // Heuristica: boton flotante "+" o "Nuevo gasto"
    const fab = this.page.getByRole('button', { name: /nuevo|agregar|añadir|\+/i }).first()
    await fab.click()
    const modal = new FormGastoPlaneadoModal(this.page)
    await modal.esperar()
    return modal
  }

  async marcarPagado(concepto) {
    const item = this.itemPorConcepto(concepto)
    await item.getByTestId(PLANIFICADOR.BTN_MARCAR_PAGADO).click()
    const modal = new FormRegistrarPagoModal(this.page)
    await modal.esperar()
    return modal
  }

  async editarPlanificado(concepto) {
    const item = this.itemPorConcepto(concepto)
    await item.getByTestId(PLANIFICADOR.BTN_EDITAR_PLANIFICADO).click()
    const modal = new FormGastoPlaneadoModal(this.page)
    await modal.esperar()
    return modal
  }

  async eliminarPlanificado(concepto) {
    const item = this.itemPorConcepto(concepto)
    await item.getByTestId(PLANIFICADOR.BTN_ELIMINAR_PLANIFICADO).click()
    await this.confirmarDialogo()
  }
}
