// Estado y acciones del superadministrador del sistema: perfil propio (rol) y
// gestión de la allowlist de correos + acceso por usuario.

export function useSuperadmin() {
  const { apiFetch } = useApiFetch()
  const me = useState('superadmin.me', () => null)
  const accesos = useState('superadmin.accesos', () => [])
  const usuarios = useState('superadmin.usuarios', () => [])
  const cargando = ref(false)

  const esSuperadmin = computed(() => me.value?.rol === 'superadmin')

  async function fetchMe() {
    try {
      me.value = await apiFetch('/api/usuarios/me')
    } catch {
      me.value = null
    }
    return me.value
  }

  async function fetchAccesos() {
    cargando.value = true
    try {
      const data = await apiFetch('/api/superadmin/accesos')
      accesos.value = data.permitidos || []
      usuarios.value = data.usuarios || []
    } finally {
      cargando.value = false
    }
  }

  async function agregarAcceso(email) {
    await apiFetch('/api/superadmin/accesos', { method: 'POST', body: { email } })
    await fetchAccesos()
  }

  async function quitarAcceso(id) {
    await apiFetch(`/api/superadmin/accesos/${id}`, { method: 'DELETE' })
    await fetchAccesos()
  }

  async function setPermitidoUsuario(id, permitido) {
    await apiFetch(`/api/superadmin/usuarios/${id}`, { method: 'PATCH', body: { permitido } })
    await fetchAccesos()
  }

  return {
    me, esSuperadmin, accesos, usuarios, cargando,
    fetchMe, fetchAccesos, agregarAcceso, quitarAcceso, setPermitidoUsuario,
  }
}
