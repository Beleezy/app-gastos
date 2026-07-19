// Estado y acciones del superadministrador: perfil propio (rol), intenciones de
// registro pendientes y gestión de acceso por usuario.

export function useSuperadmin() {
  const { apiFetch } = useApiFetch()
  const me = useState('superadmin.me', () => null)
  const intenciones = useState('superadmin.intenciones', () => [])
  const usuarios = useState('superadmin.usuarios', () => [])
  const cargando = ref(false)

  const esSuperadmin = computed(() => me.value?.rol === 'superadmin')
  const pendientes = computed(() => intenciones.value.filter((i) => i.estado === 'pendiente'))

  async function fetchMe() {
    try {
      me.value = await apiFetch('/api/usuarios/me')
    } catch {
      me.value = null
    }
    return me.value
  }

  async function fetchAcceso() {
    cargando.value = true
    try {
      const data = await apiFetch('/api/superadmin/acceso')
      intenciones.value = data.intenciones || []
      usuarios.value = data.usuarios || []
    } finally {
      cargando.value = false
    }
  }

  async function aprobar(intencionId) {
    await apiFetch(`/api/superadmin/intenciones/${intencionId}/aprobar`, { method: 'POST' })
    await fetchAcceso()
  }

  async function rechazar(intencionId) {
    await apiFetch(`/api/superadmin/intenciones/${intencionId}/rechazar`, { method: 'POST' })
    await fetchAcceso()
  }

  async function setPermitidoUsuario(id, permitido) {
    await apiFetch(`/api/superadmin/usuarios/${id}`, { method: 'PATCH', body: { permitido } })
    await fetchAcceso()
  }

  return {
    me,
    esSuperadmin,
    intenciones,
    pendientes,
    usuarios,
    cargando,
    fetchMe,
    fetchAcceso,
    aprobar,
    rechazar,
    setPermitidoUsuario,
  }
}
