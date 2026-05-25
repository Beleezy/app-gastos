// Redirige a /acceso-pendiente a los usuarios autenticados que aún no han sido
// aprobados por el superadmin. La protección real está en el servidor
// (getUsuarioFromEvent devuelve 403); esto es solo para la UX del cliente.

export default defineNuxtRouteMiddleware(async (to) => {
  if (!process.client) return

  const publicas = ['/login', '/dev-login', '/acceso-pendiente']
  if (publicas.includes(to.path) || to.path.startsWith('/auth')) return

  const user = useSupabaseUser()
  if (!user.value) return // auth.global.js se encarga de mandar a /login

  const estado = useState('acceso.estado', () => null)
  if (estado.value === null) {
    try {
      const { apiFetch } = useApiFetch()
      const r = await apiFetch('/api/acceso/estado')
      estado.value = r?.estado || 'aprobado'
    } catch {
      // Error transitorio: no bloqueamos en cliente (el servidor sigue protegido).
      estado.value = 'aprobado'
    }
  }

  if (estado.value !== 'aprobado' && estado.value !== 'no_autenticado') {
    return navigateTo('/acceso-pendiente')
  }
})
