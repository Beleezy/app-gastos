export function useVinculos() {
  const { apiFetch } = useApiFetch()

  const solicitudesPendientes = useState('vinculos-pendientes', () => [])
  const solicitudesEnviadas = useState('vinculos-enviadas', () => [])
  const isLoading = ref(false)
  const error = ref(null)

  const countPendientes = computed(() => solicitudesPendientes.value.length)

  async function fetchPendientes() {
    try {
      solicitudesPendientes.value = await apiFetch('/api/deudas/vinculos/pendientes')
    } catch (e) {
      console.error('Error fetching solicitudes pendientes:', e)
    }
  }

  async function fetchEnviadas() {
    try {
      solicitudesEnviadas.value = await apiFetch('/api/deudas/vinculos/enviadas')
    } catch (e) {
      console.error('Error fetching solicitudes enviadas:', e)
    }
  }

  async function enviarSolicitud(personaEntidadId, email, mensaje = null) {
    isLoading.value = true
    error.value = null
    try {
      const result = await apiFetch('/api/deudas/vinculos/solicitar', {
        method: 'POST',
        body: { personaEntidadId, email, mensaje },
      })
      await fetchEnviadas()
      return result
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al enviar solicitud'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function aceptarSolicitud(id) {
    isLoading.value = true
    error.value = null
    try {
      const result = await apiFetch(`/api/deudas/vinculos/${id}/aceptar`, {
        method: 'POST',
      })
      await fetchPendientes()
      return result
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al aceptar solicitud'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function rechazarSolicitud(id) {
    isLoading.value = true
    error.value = null
    try {
      const result = await apiFetch(`/api/deudas/vinculos/${id}/rechazar`, {
        method: 'POST',
      })
      await fetchPendientes()
      return result
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al rechazar solicitud'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  async function cancelarSolicitud(id) {
    isLoading.value = true
    error.value = null
    try {
      await apiFetch(`/api/deudas/vinculos/${id}`, { method: 'DELETE' })
      await fetchEnviadas()
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al cancelar solicitud'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  return {
    solicitudesPendientes,
    solicitudesEnviadas,
    isLoading,
    error,
    countPendientes,
    fetchPendientes,
    fetchEnviadas,
    enviarSolicitud,
    aceptarSolicitud,
    rechazarSolicitud,
    cancelarSolicitud,
  }
}
