export function useLLMParser() {
  const isLoading = ref(false)
  const parsedExpenses = ref([])
  const error = ref(null)

  async function parseVoiceText(text) {
    // TODO: Enviar texto a /api/voz/parse y obtener gastos estructurados
  }

  return {
    isLoading,
    parsedExpenses,
    error,
    parseVoiceText,
  }
}
