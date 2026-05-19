// Modo familiar: espacios compartidos entre usuarios. El estado del
// "espacio activo" se persiste en useState para que el resto de la UI
// pueda filtrar movimientos por contexto (personal vs espacio).

export function useEspacios() {
  const { apiFetch } = useApiFetch()
  const espacios = useState('espacios-lista', () => [])
  const invitacionesPendientes = useState('espacios-invitaciones', () => [])
  const espacioActivoId = useState('espacios-activo-id', () => null)
  const isLoading = useState('espacios-loading', () => false)

  const espacioActivo = computed(() =>
    espacios.value.find((e) => e.id === espacioActivoId.value) || null
  )

  async function fetchEspacios() {
    isLoading.value = true
    try {
      const data = await apiFetch('/api/familia')
      espacios.value = Array.isArray(data) ? data : []
    } catch (e) {
      console.warn('[espacios] fetch falló', e)
      espacios.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function fetchInvitaciones() {
    try {
      const data = await apiFetch('/api/familia/invitaciones/pendientes')
      invitacionesPendientes.value = Array.isArray(data) ? data : []
    } catch {
      invitacionesPendientes.value = []
    }
  }

  async function crearEspacio(payload) {
    const e = await apiFetch('/api/familia', { method: 'POST', body: payload })
    espacios.value = [...espacios.value, { ...e, rolUsuario: 'dueno', totalMiembros: 1 }]
    return e
  }

  async function invitarMiembro(espacioId, { destinatarioEmail, rol = 'editor', mensaje = null }) {
    return apiFetch(`/api/familia/${espacioId}/invitar`, {
      method: 'POST',
      body: { destinatarioEmail, rol, mensaje },
    })
  }

  async function aceptarInvitacion(invitacionId) {
    await apiFetch(`/api/familia/invitaciones/${invitacionId}/aceptar`, { method: 'POST' })
    invitacionesPendientes.value = invitacionesPendientes.value.filter((i) => i.id !== invitacionId)
    await fetchEspacios()
  }

  function setEspacioActivo(id) {
    espacioActivoId.value = id
  }

  return {
    espacios,
    invitacionesPendientes,
    espacioActivo,
    espacioActivoId,
    isLoading,
    fetchEspacios,
    fetchInvitaciones,
    crearEspacio,
    invitarMiembro,
    aceptarInvitacion,
    setEspacioActivo,
  }
}
