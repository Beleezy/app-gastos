export function useGastoDelete({ gastosMensuales, deleteGasto, fetchResumenMensual, toastError }) {
  const { vibrate } = useHaptic()

  const gastoEliminar = ref(null)
  const undoPendiente = ref(null)
  const undoCountdown = ref(5)
  let undoTimer = null
  let undoCountdownTimer = null

  function confirmarEliminar(gasto) {
    gastoEliminar.value = gasto
  }

  function cancelarConfirmacion() {
    gastoEliminar.value = null
  }

  function clearTimers() {
    if (undoTimer) { clearTimeout(undoTimer); undoTimer = null }
    if (undoCountdownTimer) { clearInterval(undoCountdownTimer); undoCountdownTimer = null }
  }

  function ejecutarEliminar() {
    if (!gastoEliminar.value) return
    const gasto = gastoEliminar.value
    gastoEliminar.value = null
    vibrate([10, 30, 10])

    gastosMensuales.value = gastosMensuales.value.filter(g => g.id !== gasto.id)

    undoPendiente.value = gasto
    undoCountdown.value = 5
    clearTimers()

    undoCountdownTimer = setInterval(() => {
      undoCountdown.value--
      if (undoCountdown.value <= 0 && undoCountdownTimer) {
        clearInterval(undoCountdownTimer)
        undoCountdownTimer = null
      }
    }, 1000)

    undoTimer = setTimeout(async () => {
      if (undoCountdownTimer) { clearInterval(undoCountdownTimer); undoCountdownTimer = null }
      undoPendiente.value = null
      try {
        await deleteGasto(gasto.id)
        await fetchResumenMensual()
      } catch (e) {
        toastError?.('No se pudo eliminar el gasto')
      }
      undoTimer = null
    }, 5000)
  }

  function deshacerEliminar() {
    clearTimers()
    if (undoPendiente.value) {
      vibrate(15)
      gastosMensuales.value = [...gastosMensuales.value, undoPendiente.value]
        .sort((a, b) => {
          if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha)
          return (b.hora || '').localeCompare(a.hora || '')
        })
    }
    undoPendiente.value = null
  }

  onUnmounted(clearTimers)

  return {
    gastoEliminar, undoPendiente, undoCountdown,
    confirmarEliminar, cancelarConfirmacion, ejecutarEliminar, deshacerEliminar,
  }
}
