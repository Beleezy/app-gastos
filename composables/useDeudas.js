export function useDeudas() {
  const personas = useState('deudas-personas', () => [])
  const deudasList = useState('deudas-list', () => [])
  const pagos = useState('deudas-pagos', () => [])
  const pagosPersona = useState('deudas-pagos-persona', () => [])
  const resumen = useState('deudas-resumen', () => ({
    totalMeDeben: 0,
    totalYoDebo: 0,
    balanceNeto: 0,
    countMeDeben: 0,
    countYoDebo: 0,
  }))

  const isLoading = ref(false)
  const error = ref(null)

  const tabActual = useState('deudas-tab', () => 'me_deben')
  const personaSeleccionada = useState('deudas-persona-sel', () => null)

  // Personas filtered by current tab's debt type
  const personasFiltradas = computed(() => {
    return personas.value.filter(p => {
      // Show persona if it has debts of the current type (check via deudasActivas or totalPendiente)
      // We re-fetch personas with tipo filter, so all returned personas are relevant
      return p.deudasActivas > 0 || p.totalPendiente > 0
    })
  })

  const deudasPersona = computed(() => {
    if (!personaSeleccionada.value) return []
    return deudasList.value.filter(d =>
      d.personaEntidadId === personaSeleccionada.value.id &&
      d.tipoDeuda === tabActual.value
    )
  })

  const deudasActivasPersona = computed(() => {
    return deudasPersona.value.filter(d => d.estado === 'pendiente' || d.estado === 'parcial')
  })

  const deudasSaldadasPersona = computed(() => {
    return deudasPersona.value.filter(d => d.estado === 'pagado' || d.estado === 'archivado')
  })

  const totalPendientePersona = computed(() => {
    return deudasActivasPersona.value.reduce((sum, d) => sum + d.montoPendiente, 0)
  })

  async function fetchResumen() {
    try {
      resumen.value = await $fetch('/api/deudas/resumen')
    } catch (e) {
      error.value = e.message || 'Error al cargar resumen'
    }
  }

  async function fetchPersonas() {
    isLoading.value = true
    error.value = null
    try {
      personas.value = await $fetch('/api/deudas/personas', {
        query: { tipo: tabActual.value }
      })
    } catch (e) {
      error.value = e.message || 'Error al cargar personas'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchDeudasPersona(personaId) {
    isLoading.value = true
    error.value = null
    try {
      deudasList.value = await $fetch('/api/deudas', {
        query: { personaId, tipo: tabActual.value }
      })
    } catch (e) {
      error.value = e.message || 'Error al cargar deudas'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchPagos(deudaId) {
    try {
      pagos.value = await $fetch(`/api/deudas/${deudaId}/pagos`)
    } catch (e) {
      error.value = e.message || 'Error al cargar pagos'
    }
  }

  async function fetchPagosPersona(personaId) {
    try {
      pagosPersona.value = await $fetch(`/api/deudas/personas/${personaId}/pagos-historial`)
    } catch (e) {
      error.value = e.message || 'Error al cargar historial de pagos'
    }
  }

  async function createDeuda(data) {
    try {
      await $fetch('/api/deudas', {
        method: 'POST',
        body: data,
      })
      await Promise.all([fetchResumen(), fetchPersonas()])
      if (personaSeleccionada.value) {
        await fetchDeudasPersona(personaSeleccionada.value.id)
      }
    } catch (e) {
      error.value = e.message || 'Error al crear deuda'
      throw e
    }
  }

  async function updateDeuda(id, data) {
    try {
      await $fetch(`/api/deudas/${id}`, {
        method: 'PUT',
        body: data,
      })
      await Promise.all([fetchResumen(), fetchPersonas()])
      if (personaSeleccionada.value) {
        await fetchDeudasPersona(personaSeleccionada.value.id)
      }
    } catch (e) {
      error.value = e.message || 'Error al actualizar deuda'
    }
  }

  async function deleteDeuda(id) {
    try {
      await $fetch(`/api/deudas/${id}`, { method: 'DELETE' })
      deudasList.value = deudasList.value.filter(d => d.id !== id)
      await Promise.all([fetchResumen(), fetchPersonas()])
    } catch (e) {
      error.value = e.message || 'Error al eliminar deuda'
    }
  }

  async function registrarPago(deudaId, data) {
    try {
      const result = await $fetch(`/api/deudas/${deudaId}/pagos`, {
        method: 'POST',
        body: data,
      })
      // Update local deuda state
      const idx = deudasList.value.findIndex(d => d.id === deudaId)
      if (idx !== -1) {
        deudasList.value[idx] = {
          ...deudasList.value[idx],
          ...result.deuda,
        }
      }
      await Promise.all([fetchResumen(), fetchPersonas()])
      if (personaSeleccionada.value) {
        await fetchPagosPersona(personaSeleccionada.value.id)
      }
      return result
    } catch (e) {
      error.value = e.message || 'Error al registrar pago'
      throw e
    }
  }

  async function archivarDeuda(id) {
    await updateDeuda(id, { estado: 'archivado' })
  }

  async function revertirPago(pagoId) {
    try {
      const result = await $fetch(`/api/deudas/pagos/${pagoId}`, { method: 'DELETE' })
      // Update pagosPersona to remove this pago from the groups
      pagosPersona.value = pagosPersona.value
        .map(g => {
          if (!g.pagoIds?.includes(pagoId)) return g
          const nuevosDetalles = g.detalles.filter(d => d.pagoId !== pagoId)
          const nuevoTotal = nuevosDetalles.reduce((s, d) => s + d.montoPagado, 0)
          return { ...g, detalles: nuevosDetalles, pagoIds: g.pagoIds.filter(id => id !== pagoId), montoTotal: nuevoTotal }
        })
        .filter(g => g.detalles.length > 0)
      // Refresh deudas for this person
      if (personaSeleccionada.value) {
        await fetchDeudasPersona(personaSeleccionada.value.id)
      }
      await fetchResumen()
      return result
    } catch (e) {
      error.value = e.message || 'Error al revertir pago'
      throw e
    }
  }

  async function createPersona(data) {
    try {
      const persona = await $fetch('/api/deudas/personas', {
        method: 'POST',
        body: data,
      })
      await fetchPersonas()
      return persona
    } catch (e) {
      error.value = e.message || 'Error al crear persona'
      throw e
    }
  }

  async function deletePersona(id) {
    try {
      await $fetch(`/api/deudas/personas/${id}`, { method: 'DELETE' })
      personas.value = personas.value.filter(p => p.id !== id)
      if (personaSeleccionada.value?.id === id) {
        personaSeleccionada.value = null
      }
      await fetchResumen()
    } catch (e) {
      error.value = e.message || 'Error al eliminar persona'
    }
  }

  function seleccionarPersona(persona) {
    personaSeleccionada.value = persona
  }

  function volverALista() {
    personaSeleccionada.value = null
    deudasList.value = []
    pagos.value = []
    pagosPersona.value = []
  }

  function cambiarTab(tab) {
    tabActual.value = tab
    personaSeleccionada.value = null
    deudasList.value = []
  }

  return {
    personas, deudasList, pagos, pagosPersona, resumen,
    isLoading, error,
    tabActual, personaSeleccionada,
    personasFiltradas, deudasPersona,
    deudasActivasPersona, deudasSaldadasPersona,
    totalPendientePersona,
    fetchResumen, fetchPersonas, fetchDeudasPersona, fetchPagos, fetchPagosPersona,
    createDeuda, updateDeuda, deleteDeuda,
    registrarPago, archivarDeuda, revertirPago,
    createPersona, deletePersona,
    seleccionarPersona, volverALista, cambiarTab,
  }
}
