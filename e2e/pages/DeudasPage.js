// POM de /deudas.

import { BasePage } from './BasePage.js'
import { FormDeudaModal } from './modals/FormDeudaModal.js'
import { FormPagoModal } from './modals/FormPagoModal.js'
import { FormPagoGlobalModal } from './modals/FormPagoGlobalModal.js'
import { DEUDAS } from '../helpers/selectors.js'

export class DeudasPage extends BasePage {
  async goto() {
    await this.page.goto('/deudas')
    await this.waitForReady()
  }

  // ─── Tabs me deben / yo debo ────────────────────────────
  tabMeDeben() {
    return this.page.getByTestId(DEUDAS.TAB_ME_DEBEN)
  }
  tabYoDebo() {
    return this.page.getByTestId(DEUDAS.TAB_YO_DEBO)
  }

  async verMeDeben() {
    await this.tabMeDeben().click()
  }
  async verYoDebo() {
    await this.tabYoDebo().click()
  }

  // ─── Lista personas ─────────────────────────────────────
  listaPersonas() {
    return this.page.getByTestId(DEUDAS.LISTA_PERSONAS)
  }
  personaItems() {
    return this.page.getByTestId(DEUDAS.PERSONA_ITEM)
  }

  personaPorNombre(nombre) {
    return this.personaItems().filter({ hasText: nombre }).first()
  }

  async abrirPersona(nombre) {
    await this.personaPorNombre(nombre).click()
    await this.page.getByTestId(DEUDAS.DETALLE_PERSONA).waitFor({ state: 'visible' })
  }

  // ─── Detalle persona ────────────────────────────────────
  detalle() {
    return this.page.getByTestId(DEUDAS.DETALLE_PERSONA)
  }
  deudaItems() {
    return this.page.getByTestId(DEUDAS.DEUDA_ITEM)
  }

  deudaPorConcepto(texto) {
    return this.deudaItems().filter({ hasText: texto }).first()
  }

  // ─── Crear deuda ────────────────────────────────────────
  async abrirNuevaDeuda() {
    // El FAB es un speed-dial: primero se abre, luego se toca la opción manual.
    await this.page.getByTestId('fab-deudas').first().click()
    await this.page.getByTestId(DEUDAS.BTN_NUEVA_DEUDA).first().click()
    const modal = new FormDeudaModal(this.page)
    await modal.esperar()
    return modal
  }

  // ─── Pago por concepto ──────────────────────────────────
  async pagarDeuda(conceptoDeuda) {
    const deuda = this.deudaPorConcepto(conceptoDeuda)
    await deuda.getByTestId(DEUDAS.BTN_NUEVO_PAGO).click()
    const modal = new FormPagoModal(this.page)
    await modal.esperar()
    return modal
  }

  // ─── Editar / eliminar deuda ────────────────────────────
  async editarDeuda(conceptoDeuda) {
    const deuda = this.deudaPorConcepto(conceptoDeuda)
    await deuda.getByTestId(DEUDAS.BTN_EDITAR_DEUDA).click()
    const modal = new FormDeudaModal(this.page)
    await modal.esperar()
    return modal
  }

  async eliminarDeuda(conceptoDeuda) {
    const deuda = this.deudaPorConcepto(conceptoDeuda)
    await deuda.getByTestId(DEUDAS.BTN_ELIMINAR_DEUDA).click()
    await this.confirmarDialogo()
  }

  // ─── Pago global ────────────────────────────────────────
  async abrirPagoGlobal() {
    // El boton vive dentro de DetallePersona, no a nivel de pagina.
    // Cualquier persona con >1 deuda activa lo expone.
    const btn = this.detalle().getByRole('button', { name: /pago global|registrar pago global/i })
    await btn.first().click()
    const modal = new FormPagoGlobalModal(this.page)
    await modal.esperar()
    return modal
  }
}
