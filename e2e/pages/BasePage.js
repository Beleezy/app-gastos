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
   *
   * En mobile (project=mobile) el BottomNav es visible; en desktop
   * (viewport >= lg) BottomNav lleva `lg:hidden` y el SideNav lo reemplaza
   * — asi que ningun "nav-tab-X" testid esta visible. Esperamos al `<main
   * id="contenido-principal">` que esta presente en ambos layouts.
   *
   * networkidle adicional para esperar la hidratacion de Vue/Nuxt — sin
   * eso, el HTML SSR del FAB ya existe pero su @click no esta bindeado
   * todavia y los tests que hacen click inmediato son no-op.
   */
  async waitForReady() {
    await this.page.waitForLoadState('domcontentloaded')
    await this.page.locator('#contenido-principal').first().waitFor({ state: 'visible', timeout: 15_000 })
    await this.page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
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
