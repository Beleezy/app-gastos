/**
 * Web Share API con fallback a clipboard.
 * Ver §5.4 / §5.C de planifica.md.
 */

export function useShareLink() {
  const lastError = ref(null)

  /**
   * Comparte texto/url. Usa navigator.share si está disponible (mobile),
   * sino copia al clipboard y devuelve { method: 'clipboard' }.
   *
   * @returns {Promise<{ method: 'native'|'clipboard'|'none', ok: boolean }>}
   */
  async function compartir({ title, text, url } = {}) {
    lastError.value = null
    if (typeof navigator === 'undefined') {
      return { method: 'none', ok: false }
    }

    // Web Share API
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url })
        return { method: 'native', ok: true }
      } catch (e) {
        if (e?.name === 'AbortError') return { method: 'native', ok: false }
        // Continúa al fallback
      }
    }

    // Fallback: clipboard
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText([title, text, url].filter(Boolean).join('\n'))
        return { method: 'clipboard', ok: true }
      } catch (e) {
        lastError.value = e?.message || 'Error copiando al portapapeles'
        return { method: 'clipboard', ok: false }
      }
    }

    return { method: 'none', ok: false }
  }

  /**
   * Solo copia al clipboard, sin invocar Web Share.
   */
  async function copiar(text) {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false
    try {
      await navigator.clipboard.writeText(String(text || ''))
      return true
    } catch (e) {
      lastError.value = e?.message
      return false
    }
  }

  const isShareSupported = computed(() => {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  })

  return { compartir, copiar, isShareSupported, lastError }
}
