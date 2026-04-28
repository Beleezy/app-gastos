/**
 * Composable de debounce y throttle puros, sin dependencias externas.
 * Útil para filtros de búsqueda (texto), validación en blur diferido,
 * autosave, etc. Ver §3.9 / §5.B punto 5 de planifica.md.
 */

/**
 * Devuelve una función que retrasa la invocación de `fn` hasta que
 * pasen `delay` ms sin llamadas nuevas. Cancela su timer al
 * desmontarse el componente.
 */
export function useDebounceFn(fn, delay = 300) {
  let timer = null

  function debounced(...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, delay)
  }

  function cancel() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function flush(...args) {
    cancel()
    fn(...args)
  }

  if (typeof onScopeDispose === 'function') {
    onScopeDispose(cancel)
  }

  return Object.assign(debounced, { cancel, flush })
}

/**
 * Debounce reactivo: dado un ref `source`, devuelve un ref `debounced`
 * que se actualiza tras `delay` ms de quietud. Cancela su watcher al
 * desmontarse.
 */
export function useDebouncedRef(source, delay = 300) {
  const debounced = ref(unref(source))
  let timer = null

  watch(
    () => unref(source),
    (val) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        debounced.value = val
        timer = null
      }, delay)
    },
  )

  if (typeof onScopeDispose === 'function') {
    onScopeDispose(() => {
      if (timer) clearTimeout(timer)
    })
  }

  return debounced
}

/**
 * Throttle: ejecuta `fn` como máximo una vez cada `delay` ms.
 * La primera llamada es inmediata; las siguientes dentro de la ventana
 * son ignoradas.
 */
export function useThrottleFn(fn, delay = 300) {
  let last = 0
  let trailingTimer = null
  let lastArgs = null

  function throttled(...args) {
    const now = Date.now()
    const elapsed = now - last
    if (elapsed >= delay) {
      last = now
      fn(...args)
      return
    }
    lastArgs = args
    if (!trailingTimer) {
      trailingTimer = setTimeout(() => {
        last = Date.now()
        trailingTimer = null
        if (lastArgs) {
          const a = lastArgs
          lastArgs = null
          fn(...a)
        }
      }, delay - elapsed)
    }
  }

  function cancel() {
    if (trailingTimer) {
      clearTimeout(trailingTimer)
      trailingTimer = null
    }
    lastArgs = null
  }

  if (typeof onScopeDispose === 'function') {
    onScopeDispose(cancel)
  }

  return Object.assign(throttled, { cancel })
}
