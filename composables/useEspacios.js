// Modo familiar: espacios compartidos entre usuarios. El estado del
// "espacio activo" se persiste en useState para que el resto de la UI
// pueda filtrar movimientos por contexto (personal vs espacio).

export function useEspacios() {
  const { apiFetch } = useApiFetch()
  const espacios = useState('espacios-lista', () => [])
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

  async function crearEspacio(payload) {
    const e = await apiFetch('/api/familia', { method: 'POST', body: payload })
    espacios.value = [...espacios.value, { ...e, rolUsuario: 'dueno', totalMiembros: 1 }]
    return e
  }

  function setEspacioActivo(id) {
    espacioActivoId.value = id
  }

  // ── Gestión directa de miembros (modelo admin) ──
  async function fetchMiembros(espacioId) {
    const data = await apiFetch(`/api/familia/${espacioId}/miembros`)
    return Array.isArray(data) ? data : []
  }

  async function agregarMiembro(espacioId, { email, rol = 'editor' }) {
    const m = await apiFetch(`/api/familia/${espacioId}/miembros`, {
      method: 'POST',
      body: { email, rol },
    })
    await fetchEspacios()
    return m
  }

  async function quitarMiembro(espacioId, miembroUsuarioId) {
    await apiFetch(`/api/familia/${espacioId}/miembros/${miembroUsuarioId}`, { method: 'DELETE' })
    await fetchEspacios()
  }

  // Usuarios a nombre de los cuales puedo registrar gastos (control total).
  async function fetchRegistrables() {
    try {
      const data = await apiFetch('/api/familia/registrables')
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }

  return {
    espacios,
    espacioActivo,
    espacioActivoId,
    isLoading,
    fetchEspacios,
    crearEspacio,
    setEspacioActivo,
    fetchMiembros,
    agregarMiembro,
    quitarMiembro,
    fetchRegistrables,
  }
}
