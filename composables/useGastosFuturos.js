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

  // SWR para futuros: el dato no es crítico minuto-a-minuto.
  const _fetchedAt = useState('futuros-fetched-at', () => 0)
  const FUTUROS_TTL = 2 * 60 * 1000
  let _inFlight = null

  async function fetchGastosFuturos(force = false) {
    if (!force && _fetchedAt.value > 0 && Date.now() - _fetchedAt.value < FUTUROS_TTL) {
      return
    }
    if (_inFlight) return _inFlight
    isLoading.value = true
    error.value = null
    _inFlight = (async () => {
      try {
        // En refetch forzado (tras crear/editar/eliminar/decidir) añadimos un
        // cache-buster: el GET trae Cache-Control max-age=60, así que sin esto
        // el navegador serviría la respuesta anterior y la lista no se
        // actualizaría hasta expirar el caché o recargar.
        const data = await apiFetch(
          '/api/futuros',
          force ? { query: { _t: Date.now() } } : undefined,
        )
        gastosFuturos.value = data.gastosFuturos || []
        resumenFuturos.value = data.resumenFuturos || resumenFuturos.value
        _fetchedAt.value = Date.now()
      } catch (e) {
        error.value = e.data?.message || e.message || 'Error al cargar gastos futuros'
      } finally {
        isLoading.value = false
        _inFlight = null
      }
    })()
    return _inFlight
  }

  function invalidateGastosFuturos() {
    _fetchedAt.value = 0
  }

  async function createGastoFuturo(data) {
    try {
      await apiFetch('/api/planificador/futuros', {
        method: 'POST',
        body: data,
      })
      await fetchGastosFuturos(true)
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
      await fetchGastosFuturos(true)
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
      await fetchGastosFuturos(true)
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al eliminar gasto futuro'
      throw e
    }
  }

  async function decidirOpcionFutura(proyectoId, detalleId, data) {
    try {
      const result = await apiFetch(
        `/api/planificador/futuros/${proyectoId}/detalles/${detalleId}/decidir`,
        {
          method: 'POST',
          body: data,
        },
      )
      await fetchGastosFuturos(true)
      return result
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al decidir la opción'
      throw e
    }
  }

  return {
    gastosFuturos,
    resumenFuturos,
    isLoading,
    error,
    fetchGastosFuturos,
    invalidateGastosFuturos,
    createGastoFuturo,
    updateGastoFuturo,
    deleteGastoFuturo,
    decidirOpcionFutura,
  }
}
