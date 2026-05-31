// Flag de "Vista previa (Beta)" — momentáneo, vive solo en localStorage.
// NO persiste en la configuración del usuario (BD) ni altera las pantallas
// de producción: únicamente habilita el acceso a /preview, una vista de
// demostración de las interfaces rediseñadas (R1–R5).
const KEY = 'ui-preview-v2'

export function useUiPreview() {
  const enabled = useState('ui-preview-enabled', () => false)

  function initUiPreview() {
    if (!process.client) return
    enabled.value = localStorage.getItem(KEY) === 'true'
  }

  function setUiPreview(value) {
    enabled.value = !!value
    if (process.client) localStorage.setItem(KEY, value ? 'true' : 'false')
  }

  return { enabled, initUiPreview, setUiPreview }
}
