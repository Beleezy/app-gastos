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
    montoVencidoMeDeben: 0,
    countVencidasMeDeben: 0,
    montoVencidoYoDebo: 0,
    countVencidasYoDebo: 0,
  }))
  const balance = useState('deudas-balance', () => ({ totalMeDeben: 0, totalYoDebo: 0, balanceNeto: 0, personas: [] }))
  const balanceCargando = useState('deudas-balance-cargando', () => false)
  const balanceError = useState('deudas-balance-error', () => null)

  const isLoading = ref(false)
  const error = ref(null)

  const tabActual = useState('deudas-tab', () => 'me_deben')
  const personaSeleccionada = useState('deudas-persona-sel', () => null)
  const filtroEstado = useState('deudas-filtro-estado', () => 'todos')

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

  async function fetchResumen({ noCache = false } = {}) {
    // El endpoint tiene Cache-Control max-age=60: tras una mutación hay que
    // saltarse el caché HTTP o el balance global se muestra desactualizado.
    try {
      resumen.value = await apiFetch('/api/deudas/resumen', {
        query: noCache ? { _t: Date.now() } : undefined,
        headers: noCache ? { 'Cache-Control': 'no-cache' } : undefined,
      })
    } catch (e) {
      error.value = e.message || 'Error al cargar resumen'
    }
  }

  async function fetchBalance({ noCache = false } = {}) {
    // Estado compartido con BalanceGlobal.vue: las mutaciones (crear deuda,
    // pagar, saldar) lo invalidan aquí mismo — antes el componente hacía su
    // propio fetch y "Balance global" quedaba stale hasta recargar (F4).
    balanceCargando.value = true
    balanceError.value = null
    try {
      balance.value = await apiFetch('/api/deudas/balance', {
        query: noCache ? { _t: Date.now() } : undefined,
        headers: noCache ? { 'Cache-Control': 'no-cache' } : undefined,
      })
    } catch (e) {
      balanceError.value = e?.data?.message || e?.message || 'Error desconocido'
    } finally {
      balanceCargando.value = false
    }
  }

  async function fetchPersonas({ noCache = false } = {}) {
    if (!pollingActivo.value) {
      isLoading.value = true
      error.value = null
    }
    try {
      personas.value = await apiFetch('/api/deudas/personas', {
        query: noCache ? { tipo: tabActual.value, _t: Date.now() } : { tipo: tabActual.value },
        headers: noCache ? { 'Cache-Control': 'no-cache' } : undefined,
      })
    } catch (e) {
      error.value = e.message || 'Error al cargar personas'
    } finally {
      if (!pollingActivo.value) isLoading.value = false
    }
  }

  async function fetchDeudasPersona(personaId, { noCache = false } = {}) {
    if (!pollingActivo.value) {
      isLoading.value = true
      error.value = null
    }
    try {
      deudasList.value = await apiFetch('/api/deudas', {
        query: noCache
          ? { personaId, tipo: tabActual.value, _t: Date.now() }
          : { personaId, tipo: tabActual.value },
        headers: noCache ? { 'Cache-Control': 'no-cache' } : undefined,
      })
    } catch (e) {
      error.value = e.message || 'Error al cargar deudas'
    } finally {
      if (!pollingActivo.value) isLoading.value = false
    }
  }

  async function fetchPagos(deudaId) {
    try {
      pagos.value = await apiFetch(`/api/deudas/${deudaId}/pagos`)
    } catch (e) {
      error.value = e.message || 'Error al cargar pagos'
    }
  }

  async function fetchPagosPersona(personaId, { noCache = false } = {}) {
    // El endpoint tiene max-age=60: tras registrar/saldar un pago hay que
    // saltar el caché HTTP o el historial muestra un pago menos (N7).
    try {
      pagosPersona.value = await apiFetch(`/api/deudas/personas/${personaId}/pagos-historial`, {
        query: noCache ? { _t: Date.now() } : undefined,
        headers: noCache ? { 'Cache-Control': 'no-cache' } : undefined,
      })
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

  // Invalidación única post-escritura (F4/N7): todo lo que muestra saldos
  // agregados se refresca junto, saltándose el caché HTTP.
  async function invalidarResumenes() {
    await Promise.all([
      fetchResumen({ noCache: true }),
      fetchPersonas({ noCache: true }),
      fetchBalance({ noCache: true }),
    ])
  }

  async function createDeuda(data) {
    try {
      await apiFetch('/api/deudas', {
        method: 'POST',
        body: data,
      })
      // El endpoint personas tiene Cache-Control max-age=60. Sin noCache aqui
      // la re-fetch post-create devuelve la lista pre-create del cache HTTP
      // y la nueva persona no aparece hasta que pasa el TTL.
      await invalidarResumenes()
      if (personaSeleccionada.value) {
        await fetchDeudasPersona(personaSeleccionada.value.id, { noCache: true })
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
      await invalidarResumenes()
      if (personaSeleccionada.value) {
        await fetchDeudasPersona(personaSeleccionada.value.id, { noCache: true })
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
      await invalidarResumenes()
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
      await invalidarResumenes()
      if (personaSeleccionada.value) {
        await fetchPagosPersona(personaSeleccionada.value.id, { noCache: true })
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
          fetchPagosPersona(personaSeleccionada.value.id, { noCache: true }),
          fetchDeudasPersona(personaSeleccionada.value.id, { noCache: true }),
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
        await fetchDeudasPersona(personaSeleccionada.value.id, { noCache: true })
      }
      await Promise.all([fetchResumen({ noCache: true }), fetchBalance({ noCache: true })])
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
      await Promise.all([fetchResumen({ noCache: true }), fetchBalance({ noCache: true })])
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

  // Polling for real-time sync with linked users.
  // Pausa cuando el tab no es visible o el navegador está offline para
  // ahorrar batería/datos (especialmente importante en PWA Android).
  const pollingInterval = ref(null)
  const pollingActivo = ref(false)
  let pollingVisibilityListener = null
  let pollingFetchEnCurso = false

  function iniciarPolling(personaId) {
    detenerPolling()

    async function tick() {
      if (typeof document !== 'undefined' && document.hidden) return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return
      if (!personaSeleccionada.value || personaSeleccionada.value.id !== personaId) {
        detenerPolling()
        return
      }
      if (pollingFetchEnCurso) return // Evitar solapamiento si la red es lenta.
      pollingFetchEnCurso = true
      try {
        pollingActivo.value = true
        await Promise.all([
          fetchDeudasPersona(personaId),
          fetchPagosPersona(personaId),
          fetchAuditoriaPersona(personaId),
          fetchCheckpoints(personaId),
          fetchResumen(),
        ])
      } catch {
        // Silent fail on polling
      } finally {
        pollingActivo.value = false
        pollingFetchEnCurso = false
      }
    }

    pollingInterval.value = setInterval(tick, 10000)

    if (typeof document !== 'undefined') {
      // Disparar un tick inmediato cuando el tab vuelve a ser visible
      // para no esperar hasta 10s tras retomar la PWA.
      pollingVisibilityListener = () => { if (!document.hidden) tick() }
      document.addEventListener('visibilitychange', pollingVisibilityListener, { passive: true })
    }
  }

  function detenerPolling() {
    if (pollingInterval.value) {
      clearInterval(pollingInterval.value)
      pollingInterval.value = null
    }
    if (pollingVisibilityListener && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', pollingVisibilityListener)
      pollingVisibilityListener = null
    }
    pollingFetchEnCurso = false
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
    const esRecarga = checkpoints.value.length > 0
    if (!esRecarga) cargandoCheckpoints.value = true
    try {
      checkpoints.value = await apiFetch('/api/deudas/vinculos/checkpoints', {
        query: { personaId },
      })
    } catch (e) {
      if (!esRecarga) checkpoints.value = []
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
        fetchResumen({ noCache: true }),
        fetchPersonas({ noCache: true }),
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
    filtroEstado.value = 'todos'
  }

  return {
    personas, deudasList, pagos, pagosPersona, auditoriaPersona, resumen,
    balance, balanceCargando, balanceError,
    checkpoints, guardando, restaurando, cargando: cargandoCheckpoints,
    isLoading, error,
    tabActual, personaSeleccionada, filtroEstado,
    personasFiltradas, deudasPersona,
    deudasActivasPersona, deudasSaldadasPersona,
    totalPendientePersona,
    fetchResumen, fetchPersonas, fetchDeudasPersona, fetchPagos, fetchPagosPersona, fetchAuditoriaPersona,
    fetchBalance, invalidarResumenes,
    fetchCheckpoints, crearCheckpoint, restaurarCheckpoint,
    createDeuda, updateDeuda, deleteDeuda,
    registrarPago, actualizarPago, archivarDeuda, revertirPago,
    createPersona, deletePersona, desvincularPersona,
    seleccionarPersona, volverALista, cambiarTab,
  }
}
