export function useLLMParser() {
  const isParsing = ref(false)
  const parsedExpenses = ref([])
  const error = ref(null)
  const retryStatus = ref('')   // mensaje visible del estado del retry
  let parseController = null

  async function parseVoiceText(texto) {
    if (parseController) parseController.abort()
    parseController = new AbortController()
    isParsing.value = true
    error.value = null
    parsedExpenses.value = []
    retryStatus.value = 'Interpretando...'

    try {
      const data = await $fetch('/api/voz/parse', {
        method: 'POST',
        body: { texto },
        signal: parseController.signal,
        onRequest() {
          retryStatus.value = 'Enviando al modelo...'
        },
        onResponse({ response }) {
          if (response.headers.get('x-retry-attempt')) {
            const attempt = response.headers.get('x-retry-attempt')
            const model = response.headers.get('x-retry-model') || 'modelo alternativo'
            retryStatus.value = `Intento ${attempt}/3 · ${model}...`
          }
        },
      })

      if (data.gastos && Array.isArray(data.gastos)) {
        parsedExpenses.value = data.gastos
      } else {
        error.value = 'No se pudieron interpretar los gastos'
      }

      // Exponer info de retry si el servidor la devuelve
      if (data.retryInfo) {
        const { attempt, model } = data.retryInfo
        if (attempt > 1) retryStatus.value = `Completado con ${model} (intento ${attempt})`
        else retryStatus.value = ''
      } else {
        retryStatus.value = ''
      }

      return data.gastos || []
    } catch (e) {
      if (e?.name !== 'AbortError') {
        error.value = e.data?.message || e.message || 'Error al procesar el texto'
        retryStatus.value = ''
      }
      return []
    } finally {
      isParsing.value = false
    }
  }

  function clearParsed() {
    parsedExpenses.value = []
    error.value = null
    retryStatus.value = ''
  }

  return {
    isParsing,
    parsedExpenses,
    error,
    retryStatus,
    parseVoiceText,
    clearParsed,
  }
}
