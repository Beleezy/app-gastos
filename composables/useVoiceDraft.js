/**
 * Máquina de estados del borrador de voz para registro de gastos.
 * Extrae la lógica de draft/confirmación de registro.vue.
 */
export function useVoiceDraft() {
  const {
    isListening,
    transcript,
    error: voiceError,
    isSupported,
    startListening,
    continueListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition()
  const {
    isParsing,
    parsedExpenses,
    error: parseError,
    retryStatus,
    parseVoiceText,
    clearParsed,
  } = useLLMParser()

  const showConfirmacion = ref(false)
  const lastTranscript = ref('')
  const hasDraft = ref(false)

  // Al parar de escuchar y haber texto → generar borrador
  watch(isListening, (listening, wasListening) => {
    if (wasListening && !listening) {
      setTimeout(() => {
        if (transcript.value?.trim()) {
          hasDraft.value = true
        }
      }, 300)
    }
  })

  function onStartListening() {
    resetTranscript()
    clearParsed()
    hasDraft.value = false
    startListening()
  }

  function onStopListening() {
    stopListening()
  }

  function onContinueListening() {
    continueListening()
    hasDraft.value = false
  }

  function onSendDraft() {
    if (transcript.value?.trim()) {
      lastTranscript.value = transcript.value
      hasDraft.value = false
      showConfirmacion.value = true
      parseVoiceText(transcript.value)
    }
  }

  function onDiscardDraft() {
    hasDraft.value = false
    resetTranscript()
    clearParsed()
  }

  function onOverwriteDraft() {
    hasDraft.value = false
    resetTranscript()
    clearParsed()
    startListening()
  }

  function onUpdateTranscript(newText) {
    transcript.value = newText
  }

  function reintentarParse() {
    if (lastTranscript.value) {
      parseVoiceText(lastTranscript.value)
    }
  }

  function cerrarConfirmacion() {
    showConfirmacion.value = false
    clearParsed()
    resetTranscript()
    hasDraft.value = false
  }

  return {
    // voice recognition state
    isListening,
    transcript,
    voiceError,
    isSupported,
    // draft state
    hasDraft,
    showConfirmacion,
    lastTranscript,
    // LLM parser state
    isParsing,
    parsedExpenses,
    parseError,
    retryStatus,
    // handlers
    onStartListening,
    onStopListening,
    onContinueListening,
    onSendDraft,
    onDiscardDraft,
    onOverwriteDraft,
    onUpdateTranscript,
    reintentarParse,
    cerrarConfirmacion,
  }
}
