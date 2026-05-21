/**
 * Composable para gestionar el toggle de "Nueva interfaz V2" (rediseño UI).
 *
 * Persistido en localStorage como `ui-preview-v2` (true|false). Sincronizado
 * entre pestañas vía storage event de useLocalStorage.
 *
 * Las páginas que ofrecen versión rediseñada hacen swap declarativo:
 *
 *   const { isPreviewV2 } = useUiPreview()
 *   <component :is="isPreviewV2 ? ComponenteV2 : ComponenteV1" v-bind="props" />
 *
 * Por contrato, los componentes V2 NUNCA cambian props/emits ni tocan
 * composables/endpoints — solo template y estilos.
 */

import { useLocalStorage } from './useLocalStorage'

const STORAGE_KEY = 'ui-preview-v2'

export function useUiPreview() {
  const enabled = useLocalStorage(STORAGE_KEY, false)

  function toggle() {
    enabled.value = !enabled.value
  }

  function enable() {
    enabled.value = true
  }

  function disable() {
    enabled.value = false
  }

  return {
    isPreviewV2: enabled,
    toggle,
    enable,
    disable,
  }
}
