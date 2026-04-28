/**
 * Composable de localStorage con serialización JSON segura y
 * sincronización entre tabs vía storage event.
 * Reemplaza accesos directos a localStorage en useSyncQueue,
 * useVoiceDraft, usePhotoDraft, etc.
 */

const SUBSCRIPCIONES = new Map()

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key) return
    const subs = SUBSCRIPCIONES.get(e.key)
    if (!subs) return
    let parsed = null
    try {
      parsed = e.newValue ? JSON.parse(e.newValue) : null
    } catch {
      parsed = null
    }
    for (const cb of subs) cb(parsed)
  })
}

function suscribirCambios(key, cb) {
  if (typeof window === 'undefined') return () => {}
  if (!SUBSCRIPCIONES.has(key)) SUBSCRIPCIONES.set(key, new Set())
  SUBSCRIPCIONES.get(key).add(cb)
  return () => SUBSCRIPCIONES.get(key)?.delete(cb)
}

function leer(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function escribir(key, value) {
  if (typeof localStorage === 'undefined') return
  try {
    if (value == null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
  } catch {
    // sin storage (modo privado iOS, cuota llena, etc.)
  }
}

/**
 * Crea un ref persistido en localStorage.
 *
 * @param {string} key Clave de storage.
 * @param {any} initial Valor por defecto si no existe en storage.
 * @param {object} [opts]
 * @param {boolean} [opts.syncTabs=true] Sincronizar entre pestañas.
 */
export function useLocalStorage(key, initial, { syncTabs = true } = {}) {
  const stored = leer(key, initial)
  const r = ref(stored)
  let writingFromExternal = false

  watch(
    r,
    (val) => {
      if (writingFromExternal) {
        writingFromExternal = false
        return
      }
      escribir(key, val)
    },
    { deep: true },
  )

  if (syncTabs) {
    const unsub = suscribirCambios(key, (val) => {
      writingFromExternal = true
      r.value = val == null ? initial : val
    })
    if (typeof onScopeDispose === 'function') {
      onScopeDispose(unsub)
    }
  }

  return r
}
