/**
 * Estado global del tour de onboarding y de los hints contextuales
 * "primera vez". Persistencia en localStorage.
 *
 * - `tourCompletado` / `tourSaltado`: el usuario ya vio o se saltó el tour
 *   inicial de 6 pasos.
 * - `hintsVistos`: set serializable de features cuyas primeras tips ya se
 *   mostraron (FAB, swipe meses, long-press, etc.).
 *
 * En SSR (durante prerender) devuelve estado vacío para evitar mismatches.
 */

const STORAGE_KEY = 'onboarding.v1'

function loadFromStorage() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveToStorage(state) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    void e
  }
}

export function useOnboarding() {
  const state = useState('onboarding-state', () => ({
    tourCompletado: false,
    tourSaltado: false,
    pasoActual: 0,
    activo: false,
    hintsVistos: [],
  }))

  // Hidratar desde localStorage en cliente
  if (typeof window !== 'undefined' && !state.value._hidratado) {
    const stored = loadFromStorage()
    if (stored) {
      state.value = { ...state.value, ...stored, _hidratado: true, activo: false }
    } else {
      state.value._hidratado = true
    }
  }

  function persist() {
    saveToStorage({
      tourCompletado: state.value.tourCompletado,
      tourSaltado: state.value.tourSaltado,
      hintsVistos: state.value.hintsVistos,
    })
  }

  function debeMostrarTour() {
    return !state.value.tourCompletado && !state.value.tourSaltado
  }

  function iniciarTour() {
    state.value.pasoActual = 0
    state.value.activo = true
  }

  function siguientePaso() {
    state.value.pasoActual += 1
  }

  function pasoAnterior() {
    if (state.value.pasoActual > 0) state.value.pasoActual -= 1
  }

  function completarTour() {
    state.value.tourCompletado = true
    state.value.activo = false
    state.value.pasoActual = 0
    persist()
  }

  function saltarTour() {
    state.value.tourSaltado = true
    state.value.activo = false
    state.value.pasoActual = 0
    persist()
  }

  function reiniciarTour() {
    state.value.tourCompletado = false
    state.value.tourSaltado = false
    state.value.pasoActual = 0
    state.value.activo = true
    persist()
  }

  function hintVisto(key) {
    return (state.value.hintsVistos || []).includes(key)
  }

  function marcarHintVisto(key) {
    if (hintVisto(key)) return
    state.value.hintsVistos = [...(state.value.hintsVistos || []), key]
    persist()
  }

  function reiniciarHints() {
    state.value.hintsVistos = []
    persist()
  }

  return {
    state: readonly(state),
    debeMostrarTour,
    iniciarTour,
    siguientePaso,
    pasoAnterior,
    completarTour,
    saltarTour,
    reiniciarTour,
    hintVisto,
    marcarHintVisto,
    reiniciarHints,
  }
}
