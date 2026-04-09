/**
 * Gestiona el flujo de captura de foto de voucher/recibo
 * y su envío al LLM para extraer gastos.
 */
export function usePhotoDraft() {
  const { apiFetch } = useApiFetch()

  const photoPreview = ref(null)      // data URL for preview
  const photoBase64 = ref(null)       // base64 data to send to API
  const showPhotoPreview = ref(false)
  const showPhotoConfirmacion = ref(false)

  const isParsing = ref(false)
  const parsedExpenses = ref([])
  const parseError = ref(null)
  const retryStatus = ref('')
  const totalComprobante = ref(null)

  let parseController = null

  function onPhotoCapture(dataUrl) {
    photoPreview.value = dataUrl
    photoBase64.value = dataUrl
    showPhotoPreview.value = true
  }

  async function onSendPhoto() {
    if (!photoBase64.value) return

    showPhotoPreview.value = false
    showPhotoConfirmacion.value = true

    if (parseController) parseController.abort()
    parseController = new AbortController()
    isParsing.value = true
    parseError.value = null
    parsedExpenses.value = []
    retryStatus.value = 'Analizando imagen...'

    try {
      const data = await apiFetch('/api/voz/parse-image', {
        method: 'POST',
        body: { image: photoBase64.value },
        signal: parseController.signal,
        onRequest() {
          retryStatus.value = 'Enviando al modelo...'
        },
      })

      if (data.gastos && Array.isArray(data.gastos)) {
        parsedExpenses.value = data.gastos
        totalComprobante.value = data.totalComprobante ?? null
        retryStatus.value = ''
      } else {
        parseError.value = 'No se pudieron interpretar los gastos de la imagen'
        retryStatus.value = ''
      }

      return data.gastos || []
    } catch (e) {
      if (e?.name !== 'AbortError') {
        parseError.value = e.data?.message || e.message || 'Error al procesar la imagen'
        retryStatus.value = ''
      }
      return []
    } finally {
      isParsing.value = false
    }
  }

  function onRetakePhoto() {
    showPhotoPreview.value = false
    showPhotoConfirmacion.value = false
    photoPreview.value = null
    photoBase64.value = null
    parsedExpenses.value = []
    parseError.value = null
    retryStatus.value = ''
    totalComprobante.value = null
  }

  function onCancelPhoto() {
    showPhotoPreview.value = false
    showPhotoConfirmacion.value = false
    photoPreview.value = null
    photoBase64.value = null
    parsedExpenses.value = []
    parseError.value = null
    retryStatus.value = ''
    totalComprobante.value = null
  }

  function reintentarParseImage() {
    if (photoBase64.value) {
      onSendPhoto()
    }
  }

  function cerrarPhotoConfirmacion() {
    showPhotoConfirmacion.value = false
    parsedExpenses.value = []
    parseError.value = null
    retryStatus.value = ''
    photoPreview.value = null
    photoBase64.value = null
    totalComprobante.value = null
  }

  return {
    photoPreview,
    showPhotoPreview,
    showPhotoConfirmacion,
    isParsing,
    parsedExpenses,
    parseError,
    retryStatus,
    totalComprobante,
    onPhotoCapture,
    onSendPhoto,
    onRetakePhoto,
    onCancelPhoto,
    reintentarParseImage,
    cerrarPhotoConfirmacion,
  }
}
