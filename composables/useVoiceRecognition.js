export function useVoiceRecognition() {
  const isListening = ref(false)
  const transcript = ref('')
  const error = ref(null)
  const isSupported = ref(false)

  let recognition = null

  function init() {
    if (typeof window === 'undefined') return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      isSupported.value = false
      error.value = 'Tu navegador no soporta reconocimiento de voz'
      return
    }

    isSupported.value = true
    recognition = new SpeechRecognition()
    recognition.lang = 'es-PE'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      transcript.value = finalTranscript || interimTranscript
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        error.value = 'No se detectó voz. Intenta de nuevo.'
      } else if (event.error === 'not-allowed') {
        error.value = 'Permiso de micrófono denegado'
      } else if (event.error === 'aborted') {
        // User stopped, not an error
        return
      } else {
        error.value = `Error: ${event.error}`
      }
      isListening.value = false
    }

    recognition.onend = () => {
      isListening.value = false
    }
  }

  function startListening() {
    error.value = null
    transcript.value = ''

    if (!recognition) init()
    if (!isSupported.value) return

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    try {
      recognition.start()
      isListening.value = true
    } catch (e) {
      // Already started, restart
      recognition.stop()
      setTimeout(() => {
        recognition.start()
        isListening.value = true
      }, 100)
    }
  }

  function stopListening() {
    if (recognition && isListening.value) {
      recognition.stop()
      isListening.value = false

      if (navigator.vibrate) {
        navigator.vibrate([30, 50, 30])
      }
    }
  }

  function resetTranscript() {
    transcript.value = ''
    error.value = null
  }

  onMounted(() => {
    init()
  })

  onUnmounted(() => {
    if (recognition) {
      recognition.stop()
      recognition = null
    }
  })

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  }
}
