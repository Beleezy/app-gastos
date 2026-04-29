/**
 * Combina toast + haptic + (opcional) sonido para notificaciones
 * de éxito y error. Ver §3.13 de planifica.md.
 */

export function useNotificacionLocal() {
  const toast = useToast()
  const { vibrate } = (() => {
    try {
      return useHaptic()
    } catch {
      return { vibrate: () => {} }
    }
  })()

  function exito(mensaje, opts = {}) {
    toast.success(mensaje, opts.duration)
    vibrate?.(opts.haptic ?? 10)
  }

  function error(mensaje, opts = {}) {
    toast.error(mensaje, opts.duration)
    vibrate?.(opts.haptic ?? [40, 30, 40])
  }

  function alerta(mensaje, opts = {}) {
    toast.warning(mensaje, opts.duration)
    vibrate?.(opts.haptic ?? 20)
  }

  function info(mensaje, opts = {}) {
    toast.info(mensaje, opts.duration)
  }

  return { exito, error, alerta, info }
}
