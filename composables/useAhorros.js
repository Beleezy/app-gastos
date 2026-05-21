import { MESES } from '~/utils/constants'

export function useAhorros() {
  const { apiFetch } = useApiFetch()

  const ahorrosList = useState('ahorros-list', () => [])
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
      const creado = await apiFetch('/api/ahorros', { method: 'POST', body: data })
      // Optimistic: si pertenece al mes/anio activo lo añadimos local.
      // Re-fetch en background para recalcular totales/porMedio/serie.
      if (creado && creado.mes === mesActual.value && creado.anio === anioActual.value) {
        ahorrosList.value = [
          { ...creado, monto: parseFloat(creado.monto) },
          ...ahorrosList.value,
        ]
        const m = parseFloat(creado.monto) || 0
        totalMes.value += m
        totalGlobal.value += m
      }
      fetchAhorros().catch(() => {})
      // Auto-tracking de metas (submódulo metas): si hay una meta de tipo
      // ahorro cuyo nombre coincide con el concepto del ahorro, registrar
      // movimiento. Fail-silent — no debe romper la creación del ahorro.
      try {
        const { items: metasItems, registrarMovimiento } = useMetas()
        if (metasItems.value?.length) {
          const m = metasItems.value.find(x =>
            x.tipo === 'ahorro'
            && !x.archivada
            && String(x.nombre || '').trim().toLowerCase()
              === String(creado.concepto || '').trim().toLowerCase(),
          )
          if (m) {
            registrarMovimiento(m.id, {
              monto: parseFloat(creado.monto),
              fecha: creado.fecha,
              nota: `Auto desde ahorro`,
              origenTipo: 'ahorro',
              origenId: creado.id,
            }).catch(() => {})
          }
        }
      } catch {}
    } catch (e) {
      error.value = e.message || 'Error al crear ahorro'
      throw e
    }
  }

  async function updateAhorro(id, data) {
    try {
      const actualizado = await apiFetch(`/api/ahorros/${id}`, { method: 'PUT', body: data })
      if (actualizado) {
        ahorrosList.value = ahorrosList.value.map(a =>
          a.id === id ? { ...actualizado, monto: parseFloat(actualizado.monto) } : a
        )
      }
      fetchAhorros().catch(() => {})
    } catch (e) {
      error.value = e.message || 'Error al actualizar ahorro'
      throw e
    }
  }

  async function deleteAhorro(id) {
    try {
      const eliminado = ahorrosList.value.find(a => a.id === id)
      await apiFetch(`/api/ahorros/${id}`, { method: 'DELETE' })
      ahorrosList.value = ahorrosList.value.filter(a => a.id !== id)
      if (eliminado) {
        const m = parseFloat(eliminado.monto) || 0
        totalMes.value = Math.max(0, totalMes.value - m)
        totalGlobal.value = Math.max(0, totalGlobal.value - m)
      }
      fetchAhorros().catch(() => {})
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

  // Cache SWR para medios de ahorro: cambian raramente.
  const mediosCache = useResourceCache(
    'ahorros-medios',
    () => apiFetch('/api/ahorros/medios'),
    { ttl: 5 * 60 * 1000, initial: [] },
  )

  async function fetchMedios(force = false) {
    try {
      await mediosCache.refresh(force)
    } catch (e) {
      error.value = e.message || 'Error al cargar medios'
    }
  }

  async function createMedio(data) {
    try {
      const medio = await apiFetch('/api/ahorros/medios', { method: 'POST', body: data })
      mediosCache.set([...(mediosCache.data.value || []), medio])
      return medio
    } catch (e) {
      error.value = e.message || 'Error al crear medio'
      throw e
    }
  }

  async function updateMedio(id, data) {
    try {
      const medio = await apiFetch(`/api/ahorros/medios/${id}`, { method: 'PUT', body: data })
      mediosCache.set((mediosCache.data.value || []).map(m => m.id === id ? medio : m))
      return medio
    } catch (e) {
      error.value = e.message || 'Error al actualizar medio'
      throw e
    }
  }

  async function deleteMedio(id) {
    try {
      await apiFetch(`/api/ahorros/medios/${id}`, { method: 'DELETE' })
      mediosCache.set((mediosCache.data.value || []).filter(m => m.id !== id))
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

  const medios = mediosCache.data

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
