// POM de /configuraciones. La pagina aun no tiene testids estables, asi que
// usamos selectores semanticos (getByRole + getByLabel) como fallback.

import { BasePage } from './BasePage.js'

export class ConfiguracionesPage extends BasePage {
  async goto() {
    await this.page.goto('/configuraciones')
    await this.waitForReady()
  }

  /**
   * Toggle tema claro/oscuro. Busca por aria-label o role.
   */
  async toggleTema() {
    const btn = this.page.getByRole('button', { name: /tema|oscuro|claro/i }).first()
    await btn.click()
  }

  async esTemaOscuro() {
    const html = await this.page.locator('html').getAttribute('class')
    return (html || '').includes('dark')
  }

  async cambiarMoneda(simbolo) {
    const select = this.page.getByLabel(/moneda/i).first()
    if (await select.isVisible().catch(() => false)) {
      await select.selectOption({ label: simbolo })
    }
  }
}
