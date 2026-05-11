export function useGastosFuturos() {
  const { apiFetch } = useApiFetch()

  const gastosFuturos = useState('futuros-lista', () => [])
  const resumenFuturos = useState('futuros-resumen', () => ({
    totalProyectos: 0,
    totalDetalles: 0,
    totalOpciones: 0,
    proyectosConReferencia: 0,
    totalMinimo: 0,
    totalMaximo: 0,
    totalPromedio: 0,
    promedioPorProyecto: 0,
    destacados: [],
    porPrioridad: { alta: 0, media: 0, baja: 0, sinDefinir: 0 },
    progresoDecision: { total: 0, decididos: 0, porcentaje: 0 },
    proyectoMasCaro: null,
    porCategoria: [],
  }))
  const isLoading = ref(false)
  const error = ref(null)

  async function fetchGastosFuturos() {
    isLoading.value = true
    error.value = null
    try {
      const data = await apiFetch('/api/futuros')
      gastosFuturos.value = data.gastosFuturos || []
      resumenFuturos.value = data.resumenFuturos || resumenFuturos.value
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al cargar gastos futuros'
    } finally {
      isLoading.value = false
    }
  }

  async function createGastoFuturo(data) {
    try {
      await apiFetch('/api/planificador/futuros', {
        method: 'POST',
        body: data,
      })
      await fetchGastosFuturos()
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al crear gasto futuro'
      throw e
    }
  }

  async function updateGastoFuturo(id, data) {
    try {
      await apiFetch(`/api/planificador/futuros/${id}`, {
        method: 'PUT',
        body: data,
      })
      await fetchGastosFuturos()
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al actualizar gasto futuro'
      throw e
    }
  }

  async function deleteGastoFuturo(id) {
    try {
      await apiFetch(`/api/planificador/futuros/${id}`, {
        method: 'DELETE',
      })
      await fetchGastosFuturos()
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al eliminar gasto futuro'
      throw e
    }
  }

  async function decidirOpcionFutura(proyectoId, detalleId, data) {
    try {
      const result = await apiFetch(`/api/planificador/futuros/${proyectoId}/detalles/${detalleId}/decidir`, {
        method: 'POST',
        body: data,
      })
      await fetchGastosFuturos()
      return result
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al decidir la opcion'
      throw e
    }
  }

  return {
    gastosFuturos, resumenFuturos, isLoading, error,
    fetchGastosFuturos,
    createGastoFuturo, updateGastoFuturo, deleteGastoFuturo, decidirOpcionFutura,
  }
}
