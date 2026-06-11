// Flag de "Vista previa (V5)" — momentáneo, vive solo en localStorage.
// NO persiste en la configuración del usuario (BD) ni altera las pantallas
// de producción: habilita el acceso a /preview, la versión 5 de las
// interfaces rediseñadas (rediseño V3 + formularios reales de producción).
const KEY = 'ui-preview-v5'
const LEGACY_KEYS = ['ui-preview-v3', 'ui-preview-v2']

export function useUiPreview() {
  const enabled = useState('ui-preview-enabled', () => false)

  function initUiPreview() {
    if (!import.meta.client) return
    // Quien tenía activa una versión anterior hereda el acceso sin re-activar.
    if (localStorage.getItem(KEY) === null && LEGACY_KEYS.some(k => localStorage.getItem(k) === 'true')) {
      localStorage.setItem(KEY, 'true')
    }
    enabled.value = localStorage.getItem(KEY) === 'true'
  }

  function setUiPreview(value) {
    enabled.value = !!value
    if (import.meta.client) localStorage.setItem(KEY, value ? 'true' : 'false')
  }

  return { enabled, initUiPreview, setUiPreview }
}
