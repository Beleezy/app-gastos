// El reconocimiento de voz se comparte entre todos los consumidores (registro y
// deudas). Tanto el estado reactivo (useState) como el objeto SpeechRecognition
// (a nivel de módulo) son únicos, para que `isListening`/`transcript` sean
// consistentes aunque el composable se invoque desde varios componentes a la vez
// (p.ej. el overlay de voz + la confirmación + la página de deudas).
let recognition = null
let refCount = 0
let inactivityTimer = null
let baseTranscript = ''

export function useVoiceRecognition() {
  const { currencyLocale } = useCurrency()

  const isListening = useState('voice-rec-listening', () => false)
  const transcript = useState('voice-rec-transcript', () => '')
  const error = useState('voice-rec-error', () => null)
  const isSupported = useState('voice-rec-supported', () => false)

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
    if (recognition) return

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
    } catch {
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
      try { recognition.abort() } catch { /* noop */ }
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
    refCount += 1
    init()
  })

  onUnmounted(() => {
    refCount = Math.max(0, refCount - 1)
    if (refCount === 0) {
      clearInactivityTimer()
      if (recognition) {
        try { recognition.abort() } catch { /* noop */ }
        recognition = null
      }
      isListening.value = false
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
