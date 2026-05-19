export function useConfiguraciones() {
  const { apiFetch } = useApiFetch()
  // Configuraciones del usuario cambian rara vez: TTL 5 min con SWR amplio
  // evita re-fetch en cada navegación a /configuraciones, /registro, etc.
  const cache = useResourceCache(
    'configuraciones',
    () => apiFetch('/api/configuraciones'),
    { ttl: 5 * 60 * 1000 },
  )
  const config = cache.data
  const isLoading = cache.isLoading

  async function fetchConfig(force = false) {
    try {
      return await cache.refresh(force)
    } catch (e) {
      console.error('Error al cargar configuraciones:', e)
    }
  }

  async function updateConfig(data) {
    try {
      const updated = await apiFetch('/api/configuraciones', {
        method: 'PUT',
        body: data
      })
      cache.set(updated)
    } catch (e) {
      console.error('Error al actualizar configuraciones:', e)
    }
  }

  return { config, isLoading, fetchConfig, updateConfig }
}
