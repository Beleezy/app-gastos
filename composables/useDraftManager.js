/**
 * Composable base que unifica la máquina de estados de "draft + parsing
 * + confirmación" usada por useVoiceDraft, usePhotoDraft y useVoiceDeuda.
 *
 * Ver §4.1 de planifica.md.
 *
 * Uso:
 *   const draft = useDraftManager({
 *     parser: async (input, { signal }) => {
 *       // llamar API y devolver array de items o lanzar error
 *       return apiFetch('/api/voz/parse', { method: 'POST', body: input, signal })
 *     },
 *     onResultMap: (data) => data.gastos ?? [],   // opcional
 *   })
 *
 *   draft.start(input)
 *   draft.retry()
 *   draft.discard()
 */

export function useDraftManager({ parser, onResultMap = (d) => d?.gastos ?? d ?? [] } = {}) {
  if (typeof parser !== 'function') {
    throw new Error('useDraftManager: se requiere `parser`')
  }

  const isParsing = ref(false)
  const parsedItems = ref([])
  const parseError = ref(null)
  const retryStatus = ref('')
  const lastInput = ref(null)
  const showConfirmacion = ref(false)
  const hasDraft = ref(false)
  const lastResult = ref(null)

  let controller = null

  function abort() {
    if (controller) {
      try {
        controller.abort()
      } catch (_) {
        // noop
      }
      controller = null
    }
  }

  async function start(input, { keepDraft = false } = {}) {
    lastInput.value = input
    hasDraft.value = keepDraft
    showConfirmacion.value = true
    abort()
    controller = typeof AbortController !== 'undefined' ? new AbortController() : null

    isParsing.value = true
    parseError.value = null
    parsedItems.value = []
    retryStatus.value = ''

    try {
      const data = await parser(input, { signal: controller?.signal })
      lastResult.value = data
      const items = onResultMap(data)
      if (Array.isArray(items) && items.length > 0) {
        parsedItems.value = items
      } else {
        parseError.value = parseError.value || 'No se pudieron interpretar los datos'
      }
      return data
    } catch (e) {
      if (e?.name === 'AbortError') return null
      parseError.value = e?.data?.message || e?.message || 'Error procesando la solicitud'
      return null
    } finally {
      isParsing.value = false
      retryStatus.value = ''
    }
  }

  function retry() {
    if (lastInput.value != null) {
      return start(lastInput.value)
    }
  }

  function setStatus(status) {
    retryStatus.value = status || ''
  }

  function discard() {
    abort()
    hasDraft.value = false
    parsedItems.value = []
    parseError.value = null
    retryStatus.value = ''
    lastResult.value = null
  }

  function close() {
    abort()
    showConfirmacion.value = false
    hasDraft.value = false
    parsedItems.value = []
    parseError.value = null
    retryStatus.value = ''
    lastResult.value = null
    lastInput.value = null
  }

  function markDraft() {
    hasDraft.value = true
  }

  return {
    // estado
    isParsing,
    parsedItems,
    parseError,
    retryStatus,
    showConfirmacion,
    hasDraft,
    lastInput,
    lastResult,
    // acciones
    start,
    retry,
    discard,
    close,
    abort,
    setStatus,
    markDraft,
  }
}
