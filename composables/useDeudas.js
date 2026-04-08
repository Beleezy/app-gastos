export function useDeudas() {
  const { apiFetch } = useApiFetch()
  const personas = useState('deudas-personas', () => [])
  const deudasList = useState('deudas-list', () => [])
  const pagos = useState('deudas-pagos', () => [])
  const pagosPersona = useState('deudas-pagos-persona', () => [])
  const auditoriaPersona = useState('deudas-auditoria-persona', () => [])
  const checkpoints = useState('deudas-checkpoints', () => [])
  const guardando = ref(false)
  const restaurando = ref(null)
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

  const personasFiltradas = computed(() => {
    return personas.value.filter(p => {
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
      resumen.value = await apiFetch('/api/deudas/resumen')
    } catch (e) {
      error.value = e.message || 'Error al cargar resumen'
    }
  }

  async function fetchPersonas() {
    isLoading.value = true
    error.value = null
    try {
      personas.value = await apiFetch('/api/deudas/personas', {
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
      deudasList.value = await apiFetch('/api/deudas', {
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
      pagos.value = await apiFetch(`/api/deudas/${deudaId}/pagos`)
    } catch (e) {
      error.value = e.message || 'Error al cargar pagos'
    }
  }

  async function fetchPagosPersona(personaId) {
    try {
      pagosPersona.value = await apiFetch(`/api/deudas/personas/${personaId}/pagos-historial`)
    } catch (e) {
      error.value = e.message || 'Error al cargar historial de pagos'
    }
  }

  async function fetchAuditoriaPersona(personaId) {
    try {
      auditoriaPersona.value = await apiFetch(`/api/deudas/personas/${personaId}/auditoria`)
    } catch (e) {
      error.value = e.message || 'Error al cargar auditoría'
    }
  }

  async function refreshAuditoriaIfNeeded() {
    if (personaSeleccionada.value?.vinculadoUsuarioId) {
      await fetchAuditoriaPersona(personaSeleccionada.value.id)
    }
  }

  async function createDeuda(data) {
    try {
      await apiFetch('/api/deudas', {
        method: 'POST',
        body: data,
      })
      await Promise.all([fetchResumen(), fetchPersonas()])
      if (personaSeleccionada.value) {
        await fetchDeudasPersona(personaSeleccionada.value.id)
      }
      await refreshAuditoriaIfNeeded()
    } catch (e) {
      error.value = e.message || 'Error al crear deuda'
      throw e
    }
  }

  async function updateDeuda(id, data) {
    try {
      await apiFetch(`/api/deudas/${id}`, {
        method: 'PUT',
        body: data,
      })
      await Promise.all([fetchResumen(), fetchPersonas()])
      if (personaSeleccionada.value) {
        await fetchDeudasPersona(personaSeleccionada.value.id)
      }
      await refreshAuditoriaIfNeeded()
    } catch (e) {
      error.value = e.message || 'Error al actualizar deuda'
    }
  }

  async function deleteDeuda(id) {
    try {
      await apiFetch(`/api/deudas/${id}`, { method: 'DELETE' })
      deudasList.value = deudasList.value.filter(d => d.id !== id)
      await Promise.all([fetchResumen(), fetchPersonas()])
      await refreshAuditoriaIfNeeded()
    } catch (e) {
      error.value = e.message || 'Error al eliminar deuda'
    }
  }

  async function registrarPago(deudaId, data) {
    try {
      const result = await apiFetch(`/api/deudas/${deudaId}/pagos`, {
        method: 'POST',
        body: data,
      })
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
      await refreshAuditoriaIfNeeded()
      return result
    } catch (e) {
      error.value = e.message || 'Error al registrar pago'
      throw e
    }
  }

  async function actualizarPago(pagoId, data) {
    try {
      const result = await apiFetch(`/api/deudas/pagos/${pagoId}`, {
        method: 'PUT',
        body: data,
      })
      if (personaSeleccionada.value) {
        await Promise.all([
          fetchPagosPersona(personaSeleccionada.value.id),
          fetchDeudasPersona(personaSeleccionada.value.id),
        ])
      }
      await refreshAuditoriaIfNeeded()
      return result
    } catch (e) {
      error.value = e.message || 'Error al actualizar pago'
      throw e
    }
  }

  async function archivarDeuda(id) {
    await updateDeuda(id, { estado: 'archivado' })
  }

  async function revertirPago(pagoId) {
    try {
      const result = await apiFetch(`/api/deudas/pagos/${pagoId}`, { method: 'DELETE' })
      pagosPersona.value = pagosPersona.value
        .map(g => {
          if (!g.pagoIds?.includes(pagoId)) return g
          const nuevosDetalles = g.detalles.filter(d => d.pagoId !== pagoId)
          const nuevoTotal = nuevosDetalles.reduce((s, d) => s + d.montoPagado, 0)
          return { ...g, detalles: nuevosDetalles, pagoIds: g.pagoIds.filter(id => id !== pagoId), montoTotal: nuevoTotal }
        })
        .filter(g => g.detalles.length > 0)
      if (personaSeleccionada.value) {
        await fetchDeudasPersona(personaSeleccionada.value.id)
      }
      await fetchResumen()
      await refreshAuditoriaIfNeeded()
      return result
    } catch (e) {
      error.value = e.message || 'Error al revertir pago'
      throw e
    }
  }

  async function createPersona(data) {
    try {
      const persona = await apiFetch('/api/deudas/personas', {
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
      await apiFetch(`/api/deudas/personas/${id}`, { method: 'DELETE' })
      personas.value = personas.value.filter(p => p.id !== id)
      if (personaSeleccionada.value?.id === id) {
        personaSeleccionada.value = null
      }
      await fetchResumen()
    } catch (e) {
      error.value = e.message || 'Error al eliminar persona'
    }
  }

  async function desvincularPersona(personaId) {
    try {
      const result = await apiFetch('/api/deudas/vinculos/desvincular', {
        method: 'POST',
        body: { personaEntidadId: personaId },
      })
      // Actualizar persona localmente
      if (personaSeleccionada.value?.id === personaId) {
        personaSeleccionada.value = {
          ...personaSeleccionada.value,
          vinculadoUsuarioId: null,
          vinculoParId: null,
        }
      }
      personas.value = personas.value.map(p =>
        p.id === personaId ? { ...p, vinculadoUsuarioId: null, vinculoParId: null } : p
      )
      return result
    } catch (e) {
      error.value = e.message || 'Error al desvincular'
      throw e
    }
  }

  // Polling for real-time sync with linked users
  const pollingInterval = ref(null)

  function iniciarPolling(personaId) {
    detenerPolling()
    pollingInterval.value = setInterval(async () => {
      if (!personaSeleccionada.value || personaSeleccionada.value.id !== personaId) {
        detenerPolling()
        return
      }
      try {
        await Promise.all([
          fetchDeudasPersona(personaId),
          fetchPagosPersona(personaId),
          fetchAuditoriaPersona(personaId),
          fetchResumen(),
        ])
      } catch {
        // Silent fail on polling
      }
    }, 10000) // Poll every 10 seconds
  }

  function detenerPolling() {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value)
      pollingInterval.value = null
    }
  }

  function seleccionarPersona(persona) {
    personaSeleccionada.value = persona
    if (persona.vinculadoUsuarioId) {
      iniciarPolling(persona.id)
    }
  }

  function volverALista() {
    detenerPolling()
    personaSeleccionada.value = null
    deudasList.value = []
    pagos.value = []
    pagosPersona.value = []
    auditoriaPersona.value = []
  }

  const cargandoCheckpoints = ref(false)

  async function fetchCheckpoints(personaId) {
    cargandoCheckpoints.value = true
    try {
      checkpoints.value = await apiFetch('/api/deudas/vinculos/checkpoints', {
        query: { personaId },
      })
    } catch (e) {
      checkpoints.value = []
    } finally {
      cargandoCheckpoints.value = false
    }
  }

  async function crearCheckpoint(personaId, descripcion = '') {
    guardando.value = true
    try {
      await apiFetch('/api/deudas/vinculos/checkpoints', {
        method: 'POST',
        body: { personaId, descripcion },
      })
      await fetchCheckpoints(personaId)
      await refreshAuditoriaIfNeeded()
    } catch (e) {
      error.value = e.message || 'Error al crear punto de guardado'
      throw e
    } finally {
      guardando.value = false
    }
  }

  async function restaurarCheckpoint(checkpointId, personaId) {
    restaurando.value = checkpointId
    try {
      await apiFetch(`/api/deudas/vinculos/checkpoints/${checkpointId}/restaurar`, {
        method: 'POST',
      })
      // Recargar todo: deudas, personas, checkpoints
      await Promise.all([
        fetchResumen(),
        fetchPersonas(),
        personaSeleccionada.value ? fetchDeudasPersona(personaSeleccionada.value.id) : Promise.resolve(),
        fetchCheckpoints(personaId),
        personaSeleccionada.value ? fetchPagosPersona(personaSeleccionada.value.id) : Promise.resolve(),
        refreshAuditoriaIfNeeded(),
      ])
    } catch (e) {
      error.value = e.message || 'Error al restaurar punto de guardado'
      throw e
    } finally {
      restaurando.value = null
    }
  }

  function cambiarTab(tab) {
    detenerPolling()
    tabActual.value = tab
    personaSeleccionada.value = null
    deudasList.value = []
  }

  async function mergePersonas(personaPrincipalId, personasSecundariasIds) {
    try {
      const result = await apiFetch('/api/deudas/personas/merge', {
        method: 'POST',
        body: { personaPrincipalId, personasSecundariasIds },
      })
      await Promise.all([fetchResumen(), fetchPersonas()])
      if (personaSeleccionada.value && personasSecundariasIds.includes(personaSeleccionada.value.id)) {
        personaSeleccionada.value = null
        deudasList.value = []
      }
      return result
    } catch (e) {
      error.value = e.message || 'Error al fusionar personas'
      throw e
    }
  }

  return {
    personas, deudasList, pagos, pagosPersona, auditoriaPersona, resumen,
    checkpoints, guardando, restaurando, cargando: cargandoCheckpoints,
    isLoading, error,
    tabActual, personaSeleccionada,
    personasFiltradas, deudasPersona,
    deudasActivasPersona, deudasSaldadasPersona,
    totalPendientePersona,
    fetchResumen, fetchPersonas, fetchDeudasPersona, fetchPagos, fetchPagosPersona, fetchAuditoriaPersona,
    fetchCheckpoints, crearCheckpoint, restaurarCheckpoint,
    createDeuda, updateDeuda, deleteDeuda,
    registrarPago, actualizarPago, archivarDeuda, revertirPago,
    createPersona, deletePersona, desvincularPersona, mergePersonas,
    seleccionarPersona, volverALista, cambiarTab,
  }
}
