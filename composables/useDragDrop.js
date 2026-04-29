/**
 * Helpers de drag & drop reutilizables.
 * Ver §5.A punto 1 (drag&drop calendario) y §5.A punto 5 de planifica.md.
 *
 * Soporta reordenamiento dentro de una misma lista (devolviendo un
 * array reordenado) y drag entre contenedores (mover de un día a otro
 * en el calendario, por ejemplo).
 *
 * No usa HTML5 drag API (limitada en mobile), sino pointer events
 * para máxima compatibilidad.
 *
 * Para el caso simple de "quiero soltar X sobre el día Y" expone
 * `useDropTarget` y `useDraggable`.
 */

// State global lazy: se construye al primer uso para evitar
// dependencia de Vue auto-imports al importar este módulo en tests.
let STATE = null
function getState() {
  if (!STATE) {
    STATE = {
      draggingId: ref(null),
      draggingPayload: ref(null),
      hoverTargetId: ref(null),
    }
  }
  return STATE
}

export function useDraggable(getPayload) {
  function onPointerDown(e, id) {
    if (e.button !== undefined && e.button !== 0) return
    getState().draggingId.value = id ?? null
    getState().draggingPayload.value = typeof getPayload === 'function' ? getPayload() : getPayload
  }

  function onPointerCancel() {
    getState().draggingId.value = null
    getState().draggingPayload.value = null
    getState().hoverTargetId.value = null
  }

  return {
    isDragging: computed(() => getState().draggingId.value != null),
    onPointerDown,
    onPointerCancel,
  }
}

export function useDropTarget({ id, onDrop } = {}) {
  function onPointerEnter() {
    if (getState().draggingId.value == null) return
    getState().hoverTargetId.value = id
  }

  function onPointerLeave() {
    if (getState().hoverTargetId.value === id) getState().hoverTargetId.value = null
  }

  function onPointerUp() {
    if (getState().draggingId.value == null) return
    if (getState().hoverTargetId.value !== id) return
    if (typeof onDrop === 'function') {
      onDrop({
        sourceId: getState().draggingId.value,
        payload: getState().draggingPayload.value,
        targetId: id,
      })
    }
    getState().draggingId.value = null
    getState().draggingPayload.value = null
    getState().hoverTargetId.value = null
  }

  const isHover = computed(() => getState().hoverTargetId.value === id)

  return { onPointerEnter, onPointerLeave, onPointerUp, isHover }
}

/**
 * Helper puro para reordenar arrays (útil tras drop).
 */
export function reordenar(arr, fromIndex, toIndex) {
  if (!Array.isArray(arr)) return []
  if (fromIndex === toIndex) return [...arr]
  if (fromIndex < 0 || fromIndex >= arr.length) return [...arr]
  const next = [...arr]
  const [item] = next.splice(fromIndex, 1)
  const target = Math.max(0, Math.min(next.length, toIndex))
  next.splice(target, 0, item)
  return next
}
