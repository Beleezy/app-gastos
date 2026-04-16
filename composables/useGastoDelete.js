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

  async function flushPendiente() {
    const gastoPrev = undoPendiente.value
    if (!gastoPrev) return
    clearTimers()
    undoPendiente.value = null
    try {
      await deleteGasto(gastoPrev.id)
      await fetchResumenMensual()
    } catch (e) {
      gastosMensuales.value = [...gastosMensuales.value, gastoPrev]
        .sort((a, b) => {
          if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha)
          return (b.hora || '').localeCompare(a.hora || '')
        })
      toastError?.('No se pudo eliminar el gasto')
    }
  }

  async function ejecutarEliminar() {
    if (!gastoEliminar.value) return
    const gasto = gastoEliminar.value
    gastoEliminar.value = null
    vibrate([10, 30, 10])

    // Si había otro delete pendiente, confirmarlo inmediatamente antes de iniciar el nuevo
    if (undoPendiente.value && undoPendiente.value.id !== gasto.id) {
      await flushPendiente()
    }

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
      const gastoActual = undoPendiente.value
      undoPendiente.value = null
      undoTimer = null
      if (!gastoActual) return
      try {
        await deleteGasto(gastoActual.id)
        await fetchResumenMensual()
      } catch (e) {
        gastosMensuales.value = [...gastosMensuales.value, gastoActual]
          .sort((a, b) => {
            if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha)
            return (b.hora || '').localeCompare(a.hora || '')
          })
        toastError?.('No se pudo eliminar el gasto')
      }
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

  // Al desmontar: si hay un delete pendiente, ejecutarlo sincronamente en el servidor
  // para no perder la operación (el timer de 5s sería cancelado al navegar)
  async function flushOnUnmount() {
    const gastoPrev = undoPendiente.value
    clearTimers()
    undoPendiente.value = null
    if (!gastoPrev) return
    try {
      await deleteGasto(gastoPrev.id)
    } catch (e) {
      // best effort
    }
  }

  onUnmounted(() => {
    flushOnUnmount()
  })

  return {
    gastoEliminar, undoPendiente, undoCountdown,
    confirmarEliminar, cancelarConfirmacion, ejecutarEliminar, deshacerEliminar,
    flushPendiente,
  }
}
