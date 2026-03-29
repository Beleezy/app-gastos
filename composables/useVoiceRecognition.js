export function useVoiceRecognition() {
  const isListening = ref(false)
  const transcript = ref('')
  const error = ref(null)

  function startListening() {
    // TODO: Implementar Web Speech API
  }

  function stopListening() {
    // TODO: Implementar
  }

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
  }
}
