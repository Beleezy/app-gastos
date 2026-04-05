export function useVoiceRecognition() {
  const { currencyLocale } = useCurrency()

  const isListening = ref(false)
  const transcript = ref('')
  const error = ref(null)
  const isSupported = ref(false)

  let recognition = null
  let inactivityTimer = null
  let baseTranscript = ''

  function resetInactivityTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer)
    inactivityTimer = setTimeout(() => {
      if (isListening.value) {
        stopListening()
      }
    }, 5000)
  }

  function clearInactivityTimer() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer)
      inactivityTimer = null
    }
  }

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
    recognition.lang = currencyLocale.value
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      // Tomar solo el último resultado (el más completo)
      const lastResult = event.results[event.results.length - 1]
      const currentText = lastResult[0].transcript

      transcript.value = baseTranscript ? (baseTranscript + ' ' + currentText).trim() : currentText

      // Reset inactivity timer on every new speech result
      resetInactivityTimer()
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        error.value = 'No se detectó voz. Intenta de nuevo.'
      } else if (event.error === 'not-allowed') {
        error.value = 'Permiso de micrófono denegado'
      } else if (event.error === 'aborted') {
        return
      } else {
        error.value = `Error: ${event.error}`
      }
      isListening.value = false
      clearInactivityTimer()
    }

    recognition.onend = () => {
      isListening.value = false
      clearInactivityTimer()
    }
  }

  function _beginRecognition() {
    if (!recognition) init()
    if (!isSupported.value) return

    if (navigator.vibrate) {
      navigator.vibrate(50)
    }

    try {
      recognition.start()
      isListening.value = true
      resetInactivityTimer()
    } catch (e) {
      recognition.stop()
      setTimeout(() => {
        recognition.start()
        isListening.value = true
        resetInactivityTimer()
      }, 100)
    }
  }

  function startListening() {
    error.value = null
    transcript.value = ''
    baseTranscript = ''
    // En Android, la instancia no se puede reutilizar tras onend — siempre crear una nueva
    if (recognition) {
      try { recognition.abort() } catch {}
      recognition = null
    }
    _beginRecognition()
  }

  function continueListening() {
    error.value = null
    baseTranscript = transcript.value
    _beginRecognition()
  }

  function stopListening() {
    clearInactivityTimer()
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
    baseTranscript = ''
    error.value = null
  }

  onMounted(() => {
    init()
  })

  onUnmounted(() => {
    clearInactivityTimer()
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
    continueListening,
    stopListening,
    resetTranscript,
  }
}
