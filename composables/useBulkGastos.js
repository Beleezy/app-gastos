// Operaciones en lote del registro de gastos: borrado y edición múltiple.
//
// Vivían inline en `pages/registro.vue` —999 líneas, la mayoría script—
// junto al resto de la orquestación de la página. Los textos que producen
// no los cubría nada, pese a ser lo que el usuario lee justo antes de
// borrar gastos de forma PERMANENTE: el borrado en lote no pasa por la
// papelera.

/**
 * Texto de confirmación antes de borrar en lote.
 *
 * @param {number} cantidad
 * @returns {string} vacío si no hay nada que borrar
 */
export function mensajeBulkEliminar(cantidad) {
  if (!cantidad) return ''
  const plural = cantidad === 1 ? 'gasto' : 'gastos'
  return `Vas a eliminar ${cantidad} ${plural} de forma permanente. Esta acción no tiene undo.`
}

/**
 * Texto del toast tras una operación en lote.
 *
 * Prefiere lo que informa el SERVIDOR sobre lo que se pidió: si filtró
 * alguno (ya borrado, de otro usuario), el usuario debe leer lo que
 * realmente pasó.
 *
 * El `?? ` en vez de `|| ` no es cosmético: la versión anterior hacía
 * `res.eliminados || ids.length`, que trata el 0 como "no informado" y
 * anunciaba "5 gastos eliminados" cuando no se eliminó ninguno.
 *
 * @param {number|null|undefined} confirmados lo que devolvió el servidor
 * @param {number} pedidos cuántos se mandaron
 * @param {'eliminados'|'actualizados'} accion
 */
export function mensajeBulkResultado(confirmados, pedidos, accion) {
  const n = confirmados ?? pedidos
  const sustantivo = n === 1 ? 'gasto' : 'gastos'
  const participio = n === 1 ? accion.slice(0, -1) : accion
  return `${n} ${sustantivo} ${participio}`
}

/**
 * Estado y acciones del borrado / edición en lote.
 *
 * @param {object} deps
 * @param {(ids: string[]) => Promise<any>} deps.deleteGastosBulk
 * @param {(ids: string[], campos: object) => Promise<any>} deps.updateGastosBulk
 * @param {(msg: string) => void} deps.onToast
 * @param {(msg: string) => void} deps.onError
 * @param {() => Promise<any>} deps.onRefrescar tras borrar
 * @param {() => Promise<any>} deps.onRefrescarCompleto tras editar
 */
export function useBulkGastos({
  deleteGastosBulk,
  updateGastosBulk,
  onToast,
  onError,
  onRefrescar,
  onRefrescarCompleto,
}) {
  const showBulkDeleteConfirm = ref(false)
  const bulkDeleteLoading = ref(false)
  const bulkDeletePayload = ref(null)

  const showBulkEdit = ref(false)
  const bulkEditPayload = ref(null)

  const textoBulkEliminar = computed(() => mensajeBulkEliminar(bulkDeletePayload.value?.count))

  function onBulkDeleteSolicitado(payload) {
    bulkDeletePayload.value = payload
    showBulkDeleteConfirm.value = true
  }

  async function ejecutarBulkEliminar() {
    if (!bulkDeletePayload.value) return
    const { ids, onDone } = bulkDeletePayload.value
    bulkDeleteLoading.value = true
    try {
      const res = await deleteGastosBulk(ids)
      showBulkDeleteConfirm.value = false
      onToast(mensajeBulkResultado(res?.eliminados, ids.length, 'eliminados'))
      onDone?.()
      await onRefrescar?.()
    } catch (e) {
      onError(handleApiError(e, 'No se pudieron eliminar los gastos'))
    } finally {
      bulkDeleteLoading.value = false
      bulkDeletePayload.value = null
    }
  }

  function onBulkEditSolicitado(payload) {
    bulkEditPayload.value = payload
    showBulkEdit.value = true
  }

  function cerrarBulkEdit() {
    showBulkEdit.value = false
    bulkEditPayload.value = null
  }

  async function ejecutarBulkEdit({ ids, campos }) {
    try {
      const res = await updateGastosBulk(ids, campos)
      showBulkEdit.value = false
      onToast(mensajeBulkResultado(res?.actualizados, ids.length, 'actualizados'))
      bulkEditPayload.value?.onDone?.()
      await onRefrescarCompleto?.()
    } catch (e) {
      onError(handleApiError(e, 'No se pudieron actualizar los gastos'))
    } finally {
      bulkEditPayload.value = null
    }
  }

  return {
    showBulkDeleteConfirm,
    bulkDeleteLoading,
    bulkDeletePayload,
    textoBulkEliminar,
    onBulkDeleteSolicitado,
    ejecutarBulkEliminar,
    showBulkEdit,
    bulkEditPayload,
    onBulkEditSolicitado,
    cerrarBulkEdit,
    ejecutarBulkEdit,
  }
}
