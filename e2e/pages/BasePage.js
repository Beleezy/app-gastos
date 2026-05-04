// Page Object base — comparte utilidades de navegacion y modales (BottomNav,
// BaseBottomSheet, ConfirmDialog) entre todos los POMs.

import { NAV, SHARED } from '../helpers/selectors.js'

export class BasePage {
  constructor(page) {
    this.page = page
  }

  /**
   * Espera a que la pagina y la sesion (auth bypass) esten listas.
   * Usa networkidle como heuristica + un selector estable global.
   */
  async waitForReady() {
    await this.page.waitForLoadState('domcontentloaded')
    // BottomNav presente = layout cargado y middleware paso
    await this.page.getByTestId(NAV.TAB_REGISTRO).waitFor({ state: 'visible', timeout: 15_000 })
  }

  // ─── BottomNav ──────────────────────────────────────────
  navTab(slug) {
    const map = {
      planificador: NAV.TAB_PLANIFICADOR,
      registro: NAV.TAB_REGISTRO,
      deudas: NAV.TAB_DEUDAS,
      inicio: NAV.TAB_INICIO,
    }
    return this.page.getByTestId(map[slug] || `nav-tab-${slug}`)
  }

  async irA(slug) {
    await this.navTab(slug).click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  // ─── BottomSheet activo ─────────────────────────────────
  bottomSheet() {
    return this.page.getByTestId(SHARED.BOTTOM_SHEET).last()
  }

  async cerrarBottomSheet() {
    const btn = this.bottomSheet().getByTestId(SHARED.BTN_CERRAR_BOTTOM_SHEET)
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
    } else {
      // fallback: click overlay
      await this.page.getByTestId(SHARED.BOTTOM_SHEET_OVERLAY).last().click({ position: { x: 5, y: 5 } })
    }
    await this.bottomSheet().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }

  // ─── ConfirmDialog ──────────────────────────────────────
  confirmDialog() {
    return this.page.getByTestId(SHARED.CONFIRM_DIALOG)
  }

  async confirmarDialogo() {
    await this.confirmDialog().getByTestId(SHARED.BTN_CONFIRM_YES).click()
    await this.confirmDialog().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
  }

  async cancelarDialogo() {
    await this.confirmDialog().getByTestId(SHARED.BTN_CONFIRM_NO).click()
  }

  // ─── MonthSelector ──────────────────────────────────────
  async mesSiguiente() {
    await this.page.getByTestId(SHARED.BTN_MES_NEXT).first().click()
  }

  async mesAnterior() {
    await this.page.getByTestId(SHARED.BTN_MES_PREV).first().click()
  }

  async mesActualLabel() {
    return this.page.getByTestId(SHARED.MES_ACTUAL).first().textContent()
  }
}
