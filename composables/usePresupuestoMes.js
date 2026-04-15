export function usePresupuestoMes({ mesSeleccionado, anioSeleccionado }) {
  const { apiFetch } = useApiFetch()
  const { success: toastSuccess, error: toastError } = useToast()

  const presupuesto = ref(0)
  const planId = ref(null)
  let abortCtrl = null

  async function fetchPresupuesto() {
    if (abortCtrl) abortCtrl.abort()
    abortCtrl = new AbortController()
    try {
      const data = await $fetch('/api/planificador', {
        query: { mes: mesSeleccionado.value, anio: anioSeleccionado.value },
        signal: abortCtrl.signal,
      })
      presupuesto.value = parseFloat(data.plan?.montoPresupuesto) || 0
      planId.value = data.plan?.id || null
    } catch (e) {
      if (e?.name !== 'AbortError') {
        presupuesto.value = 0
        planId.value = null
      }
    }
  }

  async function actualizarPresupuesto(monto) {
    if (!planId.value) return
    try {
      await apiFetch('/api/planificador', {
        method: 'PUT',
        body: { id: planId.value, montoPresupuesto: monto }
      })
      presupuesto.value = monto
      toastSuccess('Presupuesto actualizado')
    } catch (e) {
      toastError(handleApiError(e))
    }
  }

  return { presupuesto, planId, fetchPresupuesto, actualizarPresupuesto }
}
