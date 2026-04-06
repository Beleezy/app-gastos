export function useVoiceDeuda() {
  const { isListening, transcript, startListening, continueListening, stopListening, resetTranscript } = useVoiceRecognition()

  const { createDeuda, fetchResumen, fetchPersonas, fetchDeudasPersona, fetchPagosPersona, personaSeleccionada } = useDeudas()

  const showVozOverlay = ref(false)
  const hasDraft = ref(false)
  const isEditing = ref(false)
  const editText = ref('')
  const editTextareaRef = ref(null)

  const showConfirmVoz = ref(false)
  const vozTranscript = ref('')
  const vozParsing = ref(false)
  const vozError = ref('')
  const deudasParseadas = ref([])
  const pagosParseados = ref([])
  const guardando = ref(false)

  function abrirVozOverlay() {
    showVozOverlay.value = true
    resetTranscript()
    hasDraft.value = false
    isEditing.value = false
    startListening()
  }

  function cerrarVozOverlay() {
    showVozOverlay.value = false
    hasDraft.value = false
    isEditing.value = false
    if (isListening.value) stopListening()
    resetTranscript()
  }

  function cerrarVozOverlaySiInactivo() {
    if (!isListening.value && !hasDraft.value) {
      cerrarVozOverlay()
    }
  }

  function toggleVoz() {
    if (isListening.value) {
      stopListening()
    } else {
      resetTranscript()
      hasDraft.value = false
      startListening()
    }
  }

  watch(isListening, (listening, was) => {
    if (was && !listening) {
      setTimeout(() => {
        if (transcript.value?.trim()) {
          hasDraft.value = true
        }
      }, 300)
    }
  })

  function enviarDraft() {
    if (transcript.value?.trim()) {
      vozTranscript.value = transcript.value
      hasDraft.value = false
      showVozOverlay.value = false
      showConfirmVoz.value = true
      parsearVoz()
    }
  }

  function startEdit() {
    editText.value = transcript.value
    isEditing.value = true
    nextTick(() => {
      editTextareaRef.value?.focus()
    })
  }

  function saveEdit() {
    transcript.value = editText.value
    isEditing.value = false
  }

  function cancelEdit() {
    isEditing.value = false
  }

  function regrabar() {
    hasDraft.value = false
    isEditing.value = false
    resetTranscript()
    startListening()
  }

  function descartarDraft() {
    hasDraft.value = false
    isEditing.value = false
    resetTranscript()
    cerrarVozOverlay()
  }

  async function parsearVoz() {
    vozParsing.value = true
    vozError.value = ''
    try {
      const result = await $fetch('/api/voz/parse', {
        method: 'POST',
        body: { texto: vozTranscript.value, modo: 'deudas' }
      })
      deudasParseadas.value = result.deudas || []
      pagosParseados.value = result.pagos || []
    } catch (e) {
      vozError.value = e.data?.message || 'Error al interpretar el audio. Intenta de nuevo con frases claras como "Juan me debe 20 soles por almuerzo".'
    } finally {
      vozParsing.value = false
    }
  }

  function reintentarParse() {
    parsearVoz()
  }

  function cerrarConfirmVoz() {
    showConfirmVoz.value = false
    deudasParseadas.value = []
    pagosParseados.value = []
    vozError.value = ''
    resetTranscript()
  }

  async function confirmarDeudasVoz() {
    guardando.value = true
    try {
      for (const d of deudasParseadas.value) {
        await createDeuda({
          personaNombre: d.persona,
          tipoDeuda: d.tipo,
          concepto: d.concepto,
          monto: d.monto,
          fecha: d.fecha || new Date().toISOString().split('T')[0],
        })
      }

      for (const p of pagosParseados.value) {
        const todasPersonas = await $fetch('/api/deudas/personas')
        const nombreLower = p.persona.toLowerCase()
        const personaMatch = todasPersonas.find(pe =>
          pe.nombre.toLowerCase() === nombreLower
        )
        if (personaMatch && personaMatch.totalPendiente > 0) {
          await $fetch(`/api/deudas/personas/${personaMatch.id}/pago-global`, {
            method: 'POST',
            body: {
              monto: p.monto,
              fecha: p.fecha || new Date().toISOString().split('T')[0],
              notas: p.notas || 'Pago registrado por voz',
            }
          })
        }
      }

      cerrarConfirmVoz()
      await Promise.all([fetchResumen(), fetchPersonas()])
      if (personaSeleccionada.value) {
        await Promise.all([
          fetchDeudasPersona(personaSeleccionada.value.id),
          fetchPagosPersona(personaSeleccionada.value.id),
        ])
      }
    } catch (e) {
      vozError.value = 'Error al guardar'
    } finally {
      guardando.value = false
    }
  }

  return {
    isListening,
    transcript,
    editTextareaRef,
    showVozOverlay,
    hasDraft,
    isEditing,
    editText,
    showConfirmVoz,
    vozTranscript,
    vozParsing,
    vozError,
    deudasParseadas,
    pagosParseados,
    guardando,
    abrirVozOverlay,
    cerrarVozOverlay,
    cerrarVozOverlaySiInactivo,
    toggleVoz,
    enviarDraft,
    startEdit,
    saveEdit,
    cancelEdit,
    regrabar,
    descartarDraft,
    reintentarParse,
    cerrarConfirmVoz,
    confirmarDeudasVoz,
  }
}
