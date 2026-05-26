// Perfiles gestionados (familia): mini-usuarios sin login. El "perfil activo"
// se guarda en una COOKIE (`perfil-activo`), no en localStorage: así es válido
// tanto en SSR como en cliente (sin desajustes de hidratación) y el servidor
// la lee directamente para reencuadrar los datos de Registro/Planificador/
// Ahorro/Deudas al perfil elegido (ver server/utils/getUsuario.js).

export function usePerfiles() {
  const { apiFetch } = useApiFetch()
  const perfiles = useState('perfiles-lista', () => [])
  const perfilActivoId = useCookie('perfil-activo', {
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  const cargando = useState('perfiles-cargando', () => false)

  const perfilActivo = computed(
    () => perfiles.value.find((p) => p.id === perfilActivoId.value) || null,
  )
  const nombrePerfilActivo = computed(() => perfilActivo.value?.nombre || 'Yo')
  const viendoPerfil = computed(() => !!perfilActivoId.value)

  async function fetchPerfiles() {
    cargando.value = true
    try {
      const data = await apiFetch('/api/perfiles')
      perfiles.value = Array.isArray(data) ? data : []
    } catch {
      perfiles.value = []
    } finally {
      cargando.value = false
    }
  }

  async function crearPerfil(datos) {
    const p = await apiFetch('/api/perfiles', { method: 'POST', body: datos })
    await fetchPerfiles()
    return p
  }

  async function actualizarPerfil(id, datos) {
    await apiFetch(`/api/perfiles/${id}`, { method: 'PATCH', body: datos })
    await fetchPerfiles()
  }

  async function eliminarPerfil(id) {
    await apiFetch(`/api/perfiles/${id}`, { method: 'DELETE' })
    if (perfilActivoId.value === id) setPerfilActivo(null)
    await fetchPerfiles()
  }

  // Cambia el perfil activo (cookie). Usa `entrarPerfil` para recargar.
  function setPerfilActivo(id) {
    perfilActivoId.value = id || null
  }

  // Cambia de contexto y recarga para que todos los módulos tomen el nuevo
  // perfil (evita estados cacheados inconsistentes).
  function entrarPerfil(id) {
    setPerfilActivo(id)
    if (typeof window !== 'undefined') window.location.assign('/')
  }

  return {
    perfiles, perfilActivoId, perfilActivo, nombrePerfilActivo, viendoPerfil, cargando,
    fetchPerfiles, crearPerfil, actualizarPerfil, eliminarPerfil, setPerfilActivo, entrarPerfil,
  }
}
