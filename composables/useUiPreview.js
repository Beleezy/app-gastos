// Flag de "Vista previa (V3)" — momentáneo, vive solo en localStorage.
// NO persiste en la configuración del usuario (BD) ni altera las pantallas
// de producción: únicamente habilita el acceso a /preview, una vista de
// demostración de las interfaces rediseñadas (Versión 3).
const KEY = 'ui-preview-v3'
const LEGACY_KEY = 'ui-preview-v2'

export function useUiPreview() {
  const enabled = useState('ui-preview-enabled', () => false)

  function initUiPreview() {
    if (!import.meta.client) return
    // Quien tenía activa la v2 hereda el acceso a la V3 sin re-activar.
    if (localStorage.getItem(KEY) === null && localStorage.getItem(LEGACY_KEY) === 'true') {
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
