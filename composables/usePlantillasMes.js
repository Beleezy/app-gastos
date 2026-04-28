/**
 * Composable de plantillas de mes.
 * Ver §5.A punto 4 de planifica.md.
 */

export function usePlantillasMes() {
  const { apiFetch } = useApiFetch()

  const plantillas = useState('planificador-plantillas', () => [])
  const isLoading = ref(false)
  const error = ref(null)

  async function fetchPlantillas() {
    isLoading.value = true
    error.value = null
    try {
      plantillas.value = await apiFetch('/api/planificador/plantillas')
    } catch (e) {
      error.value = e?.data?.message || e?.message || 'Error cargando plantillas'
    } finally {
      isLoading.value = false
    }
  }

  async function crear(payload) {
    const creada = await apiFetch('/api/planificador/plantillas', {
      method: 'POST',
      body: payload,
    })
    plantillas.value = [creada, ...(plantillas.value || [])]
    return creada
  }

  async function crearDesdePlan({ nombre, planMensualId, notas }) {
    return crear({ nombre, desdePlanId: planMensualId, notas })
  }

  async function aplicar({ plantillaId, planMensualId }) {
    return apiFetch(`/api/planificador/plantillas/${plantillaId}/aplicar`, {
      method: 'POST',
      body: { planMensualId },
    })
  }

  async function eliminar(plantillaId) {
    await apiFetch(`/api/planificador/plantillas/${plantillaId}`, { method: 'DELETE' })
    plantillas.value = (plantillas.value || []).filter((p) => p.id !== plantillaId)
  }

  return {
    plantillas,
    isLoading,
    error,
    fetchPlantillas,
    crear,
    crearDesdePlan,
    aplicar,
    eliminar,
  }
}
