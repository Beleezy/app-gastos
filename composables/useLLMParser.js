export function useLLMParser() {
  const isParsing = ref(false)
  const parsedExpenses = ref([])
  const error = ref(null)

  async function parseVoiceText(texto) {
    isParsing.value = true
    error.value = null
    parsedExpenses.value = []

    try {
      const data = await $fetch('/api/voz/parse', {
        method: 'POST',
        body: { texto }
      })

      if (data.gastos && Array.isArray(data.gastos)) {
        parsedExpenses.value = data.gastos
      } else {
        error.value = 'No se pudieron interpretar los gastos'
      }

      return data.gastos || []
    } catch (e) {
      const msg = e.data?.message || e.message || 'Error al procesar el texto'
      error.value = msg.includes('intentos') ? 'No se pudo interpretar el texto. Intenta hablar más claro o usar frases simples como "gasté 10 soles en almuerzo".' : msg
      return []
    } finally {
      isParsing.value = false
    }
  }

  function clearParsed() {
    parsedExpenses.value = []
    error.value = null
  }

  return {
    isParsing,
    parsedExpenses,
    error,
    parseVoiceText,
    clearParsed,
  }
}
