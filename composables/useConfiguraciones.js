export function useConfiguraciones() {
  const { apiFetch } = useApiFetch()
  const config = useState('configuraciones', () => null)
  const isLoading = ref(false)

  async function fetchConfig() {
    isLoading.value = true
    try {
      config.value = await apiFetch('/api/configuraciones')
    } catch (e) {
      console.error('Error al cargar configuraciones:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function updateConfig(data) {
    try {
      config.value = await apiFetch('/api/configuraciones', {
        method: 'PUT',
        body: data
      })
    } catch (e) {
      console.error('Error al actualizar configuraciones:', e)
    }
  }

  return { config, isLoading, fetchConfig, updateConfig }
}
