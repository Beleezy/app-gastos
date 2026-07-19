export function useGoogleCalendar() {
  const { apiFetch } = useApiFetch()
  const estado = useState('gcal-estado', () => ({ conectado: false, loading: true }))

  async function fetchEstado() {
    estado.value.loading = true
    try {
      const data = await apiFetch('/api/integraciones/google')
      estado.value = { ...data, loading: false }
    } catch (e) {
      estado.value = { conectado: false, loading: false, error: e.message }
    }
  }

  async function conectar() {
    const { authUrl } = await apiFetch('/api/integraciones/google/oauth-start', { method: 'POST' })
    window.location.href = authUrl
  }

  async function desconectar(borrarCalendario = false) {
    await apiFetch(`/api/integraciones/google?borrarCalendario=${borrarCalendario}`, {
      method: 'DELETE',
    })
    await fetchEstado()
  }

  async function resincronizar() {
    const result = await apiFetch('/api/integraciones/google/resync', { method: 'POST' })
    await fetchEstado()
    return result
  }

  async function actualizarRecordatorios(recordatorios) {
    const result = await apiFetch('/api/integraciones/google/config', {
      method: 'PATCH',
      body: { recordatorios },
    })
    await fetchEstado()
    return result
  }

  return { estado, fetchEstado, conectar, desconectar, resincronizar, actualizarRecordatorios }
}
