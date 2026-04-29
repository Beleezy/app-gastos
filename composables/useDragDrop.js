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

const STATE = {
  draggingId: ref(null),
  draggingPayload: ref(null),
  hoverTargetId: ref(null),
}

export function useDraggable(getPayload) {
  function onPointerDown(e, id) {
    if (e.button !== undefined && e.button !== 0) return
    STATE.draggingId.value = id ?? null
    STATE.draggingPayload.value = typeof getPayload === 'function' ? getPayload() : getPayload
  }

  function onPointerCancel() {
    STATE.draggingId.value = null
    STATE.draggingPayload.value = null
    STATE.hoverTargetId.value = null
  }

  return {
    isDragging: computed(() => STATE.draggingId.value != null),
    onPointerDown,
    onPointerCancel,
  }
}

export function useDropTarget({ id, onDrop } = {}) {
  function onPointerEnter() {
    if (STATE.draggingId.value == null) return
    STATE.hoverTargetId.value = id
  }

  function onPointerLeave() {
    if (STATE.hoverTargetId.value === id) STATE.hoverTargetId.value = null
  }

  function onPointerUp() {
    if (STATE.draggingId.value == null) return
    if (STATE.hoverTargetId.value !== id) return
    if (typeof onDrop === 'function') {
      onDrop({
        sourceId: STATE.draggingId.value,
        payload: STATE.draggingPayload.value,
        targetId: id,
      })
    }
    STATE.draggingId.value = null
    STATE.draggingPayload.value = null
    STATE.hoverTargetId.value = null
  }

  const isHover = computed(() => STATE.hoverTargetId.value === id)

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
