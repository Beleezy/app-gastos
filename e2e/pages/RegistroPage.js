// POM de la pagina /registro: tabs, historial, FAB de registro manual,
// botones de voz/foto, filtros.

import { BasePage } from './BasePage.js'
import { FormGastoManualModal } from './modals/FormGastoManualModal.js'
import { REGISTRO } from '../helpers/selectors.js'

export class RegistroPage extends BasePage {
  async goto() {
    await this.page.goto('/registro')
    await this.waitForReady()
  }

  // ─── Tabs internos ──────────────────────────────────────
  tabHistorial() { return this.page.getByTestId(REGISTRO.TAB_HISTORIAL) }
  tabMapa() { return this.page.getByTestId(REGISTRO.TAB_MAPA) }
  tabCategorias() { return this.page.getByTestId(REGISTRO.TAB_CATEGORIAS) }
  tabStats() { return this.page.getByTestId(REGISTRO.TAB_STATS) }

  // ─── Historial ──────────────────────────────────────────
  historial() { return this.page.getByTestId(REGISTRO.HISTORIAL) }
  itemsGasto() { return this.page.getByTestId(REGISTRO.GASTO_ITEM) }

  async cantidadGastosVisibles() {
    return this.itemsGasto().count()
  }

  /**
   * Devuelve el primer item cuyo concepto contenga `texto`.
   */
  itemPorConcepto(texto) {
    return this.itemsGasto().filter({ hasText: texto }).first()
  }

  // ─── Acciones ───────────────────────────────────────────
  /**
   * Abre el bottom-sheet de FormGastoManual via FAB y devuelve el POM.
   */
  async abrirFormManual() {
    await this.page.getByTestId(REGISTRO.BTN_REGISTRO_MANUAL).first().click()
    const modal = new FormGastoManualModal(this.page)
    await modal.esperar()
    return modal
  }

  /**
   * Edita un gasto cuyo concepto contenga `texto`. Devuelve el modal abierto.
   */
  async editarGasto(texto) {
    const item = this.itemPorConcepto(texto)
    await item.getByTestId(REGISTRO.BTN_EDITAR).click()
    const modal = new FormGastoManualModal(this.page)
    await modal.esperar()
    return modal
  }

  async eliminarGasto(texto) {
    const item = this.itemPorConcepto(texto)
    await item.getByTestId(REGISTRO.BTN_ELIMINAR).click()
    await this.confirmarDialogo()
  }

  // ─── Filtros ────────────────────────────────────────────
  async filtrarPorCategoria(slugOrName) {
    await this.page.getByTestId(`filtro-categoria-${slugOrName}`).first().click()
  }

  // ─── Voz / foto ─────────────────────────────────────────
  btnMicrofono() { return this.page.getByTestId(REGISTRO.BTN_MICROFONO) }
  btnCamara() { return this.page.getByTestId(REGISTRO.BTN_CAMARA) }
  inputFoto() { return this.page.getByTestId(REGISTRO.INPUT_FOTO) }

  /**
   * Inyecta una transcripcion via window y dispara el flujo de voz.
   * El stub de SpeechRecognition se instala via page.addInitScript en el spec.
   */
  async dictarTranscripcion(texto) {
    await this.page.evaluate((t) => { window.__e2eTranscript = t }, texto)
    await this.btnMicrofono().click()
  }
}
