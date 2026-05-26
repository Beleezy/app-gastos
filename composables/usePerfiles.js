// Perfiles gestionados (familia): mini-usuarios sin login. El "perfil activo"
// se persiste en localStorage y se envía como X-Perfil-Id en cada request
// (ver plugins/fetch.js), de modo que el servidor reencuadra los datos de
// Registro/Planificador/Ahorro/Deudas al perfil elegido.

const STORAGE_KEY = 'perfil-activo-id'

export function usePerfiles() {
  const { apiFetch } = useApiFetch()
  const perfiles = useState('perfiles-lista', () => [])
  const perfilActivoId = useState('perfil-activo-id-state', () => {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(STORAGE_KEY) || null
    return null
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
      // Si el perfil activo ya no existe, volver a "Yo".
      if (perfilActivoId.value && !perfiles.value.some((p) => p.id === perfilActivoId.value)) {
        setPerfilActivo(null)
      }
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

  // Cambia el perfil activo SIN recargar. Usa `entrarPerfil` para recargar.
  function setPerfilActivo(id) {
    perfilActivoId.value = id || null
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {}
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
