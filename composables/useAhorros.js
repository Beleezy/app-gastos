import { MESES } from '~/utils/constants'

export function useAhorros() {
  const { apiFetch } = useApiFetch()

  const ahorrosList = useState('ahorros-list', () => [])
  const medios = useState('ahorros-medios', () => [])
  const totalMes = useState('ahorros-total-mes', () => 0)
  const totalGlobal = useState('ahorros-total-global', () => 0)
  const porMedio = useState('ahorros-por-medio', () => [])
  const metaMensual = useState('ahorros-meta-mensual', () => null)
  const metaGlobal = useState('ahorros-meta-global', () => null)
  const progresoMensual = useState('ahorros-progreso-mensual', () => null)
  const progresoGlobal = useState('ahorros-progreso-global', () => null)
  const serie6Meses = useState('ahorros-serie', () => [])
  const ahorrosMesSeleccionado = useState('ahorros-mes-seleccionado-list', () => [])
  const mesSeleccionadoGrafico = useState('ahorros-mes-seleccionado-key', () => null)
  const isLoadingMesGrafico = ref(false)
  const isLoading = ref(false)
  const error = ref(null)

  const mesActual = useState('ahorros-mes', () => new Date().getMonth() + 1)
  const anioActual = useState('ahorros-anio', () => new Date().getFullYear())

  const nombreMes = computed(() => MESES[mesActual.value - 1] || '')
  const esHoy = computed(() => {
    const now = new Date()
    return mesActual.value === now.getMonth() + 1 && anioActual.value === now.getFullYear()
  })

  async function fetchAhorros() {
    isLoading.value = true
    error.value = null
    try {
      const data = await apiFetch('/api/ahorros', {
        query: { mes: mesActual.value, anio: anioActual.value }
      })
      ahorrosList.value = data.ahorros
      totalMes.value = data.totalMes
      totalGlobal.value = data.totalGlobal
      porMedio.value = data.porMedio
      metaMensual.value = data.metaMensual
      metaGlobal.value = data.metaGlobal
      progresoMensual.value = data.progresoMensual
      progresoGlobal.value = data.progresoGlobal
      serie6Meses.value = data.serie6Meses
    } catch (e) {
      error.value = e.message || 'Error al cargar ahorros'
    } finally {
      isLoading.value = false
    }
  }

  async function createAhorro(data) {
    try {
      await apiFetch('/api/ahorros', { method: 'POST', body: data })
      await fetchAhorros()
    } catch (e) {
      error.value = e.message || 'Error al crear ahorro'
      throw e
    }
  }

  async function updateAhorro(id, data) {
    try {
      await apiFetch(`/api/ahorros/${id}`, { method: 'PUT', body: data })
      await fetchAhorros()
    } catch (e) {
      error.value = e.message || 'Error al actualizar ahorro'
      throw e
    }
  }

  async function deleteAhorro(id) {
    try {
      await apiFetch(`/api/ahorros/${id}`, { method: 'DELETE' })
      ahorrosList.value = ahorrosList.value.filter(a => a.id !== id)
      await fetchAhorros()
    } catch (e) {
      error.value = e.message || 'Error al eliminar ahorro'
      throw e
    }
  }

  async function fetchAhorrosMes(mes, anio) {
    isLoadingMesGrafico.value = true
    try {
      const data = await apiFetch('/api/ahorros/mes', { query: { mes, anio } })
      ahorrosMesSeleccionado.value = data
      mesSeleccionadoGrafico.value = { mes, anio }
    } catch (e) {
      error.value = e.message || 'Error al cargar mes'
      throw e
    } finally {
      isLoadingMesGrafico.value = false
    }
  }

  function limpiarMesSeleccionado() {
    ahorrosMesSeleccionado.value = []
    mesSeleccionadoGrafico.value = null
  }

  async function fetchMedios() {
    try {
      medios.value = await apiFetch('/api/ahorros/medios')
    } catch (e) {
      error.value = e.message || 'Error al cargar medios'
    }
  }

  async function createMedio(data) {
    try {
      const medio = await apiFetch('/api/ahorros/medios', { method: 'POST', body: data })
      medios.value = [...medios.value, medio]
      return medio
    } catch (e) {
      error.value = e.message || 'Error al crear medio'
      throw e
    }
  }

  async function updateMedio(id, data) {
    try {
      const medio = await apiFetch(`/api/ahorros/medios/${id}`, { method: 'PUT', body: data })
      medios.value = medios.value.map(m => m.id === id ? medio : m)
      return medio
    } catch (e) {
      error.value = e.message || 'Error al actualizar medio'
      throw e
    }
  }

  async function deleteMedio(id) {
    try {
      await apiFetch(`/api/ahorros/medios/${id}`, { method: 'DELETE' })
      medios.value = medios.value.filter(m => m.id !== id)
    } catch (e) {
      error.value = e.message || 'Error al eliminar medio'
      throw e
    }
  }

  async function setMeta(data) {
    try {
      await apiFetch('/api/ahorros/metas', { method: 'PUT', body: data })
      await fetchAhorros()
    } catch (e) {
      error.value = e.message || 'Error al guardar meta'
      throw e
    }
  }

  function mesSiguiente() {
    if (mesActual.value === 12) {
      mesActual.value = 1
      anioActual.value++
    } else {
      mesActual.value++
    }
  }

  function mesAnterior() {
    if (mesActual.value === 1) {
      mesActual.value = 12
      anioActual.value--
    } else {
      mesActual.value--
    }
  }

  return {
    ahorrosList, medios, totalMes, totalGlobal, porMedio,
    metaMensual, metaGlobal, progresoMensual, progresoGlobal,
    serie6Meses, isLoading, error,
    mesActual, anioActual, nombreMes, esHoy,
    ahorrosMesSeleccionado, mesSeleccionadoGrafico, isLoadingMesGrafico,
    fetchAhorros, createAhorro, updateAhorro, deleteAhorro,
    fetchMedios, createMedio, updateMedio, deleteMedio,
    setMeta, mesSiguiente, mesAnterior,
    fetchAhorrosMes, limpiarMesSeleccionado,
  }
}
