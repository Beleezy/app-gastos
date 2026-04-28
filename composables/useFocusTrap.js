/**
 * Composable de focus trap para modales y bottom sheets.
 * Ver §3.3 / §4.1 de planifica.md.
 *
 * Llama a `activate()` cuando el modal monta y `deactivate()` al cerrar.
 * Devuelve también un handler `onKeydown(e)` para enganchar al elemento
 * raíz del modal — atrapa Tab/Shift+Tab y emite Escape como callback.
 */
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(containerRef, { onEscape } = {}) {
  let previousActive = null

  function getFocusable() {
    const el = containerRef?.value
    if (!el) return []
    return Array.from(el.querySelectorAll(FOCUSABLE)).filter(
      (n) => !n.hasAttribute('disabled') && n.offsetParent !== null,
    )
  }

  function focusFirst() {
    const list = getFocusable()
    if (list.length > 0) list[0].focus()
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && typeof onEscape === 'function') {
      e.stopPropagation()
      onEscape(e)
      return
    }
    if (e.key !== 'Tab') return
    const list = getFocusable()
    if (list.length === 0) return
    const first = list[0]
    const last = list[list.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  function activate() {
    if (typeof document === 'undefined') return
    previousActive = document.activeElement
    nextTick(focusFirst)
  }

  function deactivate() {
    if (previousActive && typeof previousActive.focus === 'function') {
      try {
        previousActive.focus()
      } catch (_) {
        // ignore
      }
    }
    previousActive = null
  }

  return { activate, deactivate, onKeydown, focusFirst, getFocusable }
}
