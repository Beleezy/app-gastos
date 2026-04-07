import { DIAS_SEMANA, MESES } from '~/utils/constants'

export function useGastos() {
  const { apiFetch } = useApiFetch()
  const gastos = useState('registro-gastos', () => [])
  const gastosMensuales = useState('registro-gastos-mensuales', () => [])
  const categorias = useState('registro-categorias', () => [])
  const resumen = useState('registro-resumen', () => ({ totalDia: 0, totalMes: 0 }))
  const isLoading = ref(false)
  const isLoadingMensual = ref(false)
  const error = ref(null)

  const mesSeleccionado = useState('registro-mes', () => new Date().getMonth() + 1)
  const anioSeleccionado = useState('registro-anio', () => new Date().getFullYear())
  const fechaSeleccionada = useState('registro-fecha', () => new Date().toISOString().split('T')[0])

  const fechaFormateada = computed(() => {
    const [anio, mes, dia] = fechaSeleccionada.value.split('-').map(Number)
    const fecha = new Date(anio, mes - 1, dia)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const ayer = new Date(hoy)
    ayer.setDate(ayer.getDate() - 1)

    if (fecha.toDateString() === hoy.toDateString()) return 'Hoy'
    if (fecha.toDateString() === ayer.toDateString()) return 'Ayer'

    const diaSemana = DIAS_SEMANA[fecha.getDay()]
    return `${diaSemana} ${dia}/${String(mes).padStart(2, '0')}`
  })

  const esHoy = computed(() => {
    return fechaSeleccionada.value === new Date().toISOString().split('T')[0]
  })

  const gastosPorHora = computed(() => {
    return [...gastos.value].sort((a, b) => {
      if (a.hora > b.hora) return -1
      if (a.hora < b.hora) return 1
      return 0
    })
  })

  let fetchGastosController = null
  let fetchMensualController = null

  async function fetchGastos() {
    if (fetchGastosController) fetchGastosController.abort()
    fetchGastosController = new AbortController()
    isLoading.value = true
    error.value = null
    try {
      const data = await apiFetch('/api/gastos', {
        query: { fecha: fechaSeleccionada.value },
        signal: fetchGastosController.signal,
      })
      gastos.value = data
    } catch (e) {
      if (e?.name !== 'AbortError') error.value = e.message || 'Error al cargar gastos'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchResumen(fecha, mes, anio) {
    const f = fecha || fechaSeleccionada.value
    const [a, m] = f.split('-')
    const mesParam = mes || Number(m)
    const anioParam = anio || Number(a)
    try {
      const data = await apiFetch('/api/gastos/resumen', {
        query: { fecha: f, mes: mesParam, anio: anioParam }
      })
      resumen.value = data
    } catch (e) {
      // silently fail
    }
  }

  async function fetchCategorias() {
    try {
      categorias.value = await apiFetch('/api/categorias')
    } catch (e) {
      error.value = e.message || 'Error al cargar categorías'
    }
  }

  async function createGasto(data) {
    try {
      const nuevo = await apiFetch('/api/gastos', {
        method: 'POST',
        body: data
      })
      // Add optimistically if same date
      if (nuevo.fecha === fechaSeleccionada.value) {
        gastos.value = [nuevo, ...gastos.value]
      }
      await fetchResumen()
      return nuevo
    } catch (e) {
      error.value = e.message || 'Error al crear gasto'
      throw e
    }
  }

  async function createGastosBulk(gastosData, transcripcionVoz) {
    try {
      const nuevos = await apiFetch('/api/gastos/bulk', {
        method: 'POST',
        body: { gastos: gastosData, transcripcionVoz }
      })
      // Add those matching current date
      const mismaFecha = nuevos.filter(g => g.fecha === fechaSeleccionada.value)
      if (mismaFecha.length > 0) {
        gastos.value = [...mismaFecha, ...gastos.value]
      }
      await fetchResumen()
      return nuevos
    } catch (e) {
      error.value = e.message || 'Error al guardar gastos'
      throw e
    }
  }

  async function updateGasto(id, data) {
    try {
      const updated = await apiFetch(`/api/gastos/${id}`, {
        method: 'PUT',
        body: data
      })
      const idx = gastos.value.findIndex(g => g.id === id)
      if (idx !== -1) {
        gastos.value[idx] = updated
      }
      await fetchResumen()
      return updated
    } catch (e) {
      error.value = e.message || 'Error al actualizar gasto'
      throw e
    }
  }

  async function deleteGasto(id) {
    try {
      await apiFetch(`/api/gastos/${id}`, { method: 'DELETE' })
      gastos.value = gastos.value.filter(g => g.id !== id)
      await fetchResumen()
    } catch (e) {
      error.value = e.message || 'Error al eliminar gasto'
      throw e
    }
  }

  async function fetchGastosMensuales() {
    if (fetchMensualController) fetchMensualController.abort()
    fetchMensualController = new AbortController()
    isLoadingMensual.value = true
    try {
      const data = await apiFetch('/api/gastos', {
        query: { mes: mesSeleccionado.value, anio: anioSeleccionado.value },
        signal: fetchMensualController.signal,
      })
      gastosMensuales.value = data
    } catch (e) {
      if (e?.name !== 'AbortError') error.value = e.message || 'Error al cargar gastos mensuales'
    } finally {
      isLoadingMensual.value = false
    }
  }

  const mesFormateado = computed(() => {
    return `${MESES[mesSeleccionado.value - 1]} ${anioSeleccionado.value}`
  })

  const esMesActual = computed(() => {
    const hoy = new Date()
    return mesSeleccionado.value === hoy.getMonth() + 1 && anioSeleccionado.value === hoy.getFullYear()
  })

  // Agrupa gastos mensuales por día
  const gastosPorDia = computed(() => {
    const agrupado = {}
    for (const g of gastosMensuales.value) {
      if (!agrupado[g.fecha]) {
        agrupado[g.fecha] = { fecha: g.fecha, gastos: [], total: 0 }
      }
      agrupado[g.fecha].gastos.push(g)
      agrupado[g.fecha].total += parseFloat(g.monto) || 0
    }
    // Ordenar por fecha descendente
    return Object.values(agrupado).sort((a, b) => b.fecha.localeCompare(a.fecha))
  })

  // Agrupa gastos mensuales por semana
  const gastosPorSemana = computed(() => {
    const semanas = {}
    for (const g of gastosMensuales.value) {
      const [anio, mes, dia] = g.fecha.split('-').map(Number)
      const fecha = new Date(anio, mes - 1, dia)
      // Calcular inicio de semana (lunes)
      const dayOfWeek = fecha.getDay()
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const lunes = new Date(fecha)
      lunes.setDate(fecha.getDate() - diffToMonday)
      const lunesKey = lunes.toISOString().split('T')[0]

      if (!semanas[lunesKey]) {
        const domingo = new Date(lunes)
        domingo.setDate(lunes.getDate() + 6)
        semanas[lunesKey] = {
          key: lunesKey,
          desde: lunes.toISOString().split('T')[0],
          hasta: domingo.toISOString().split('T')[0],
          gastos: [],
          total: 0,
          diasConGastos: {},
        }
      }
      semanas[lunesKey].gastos.push(g)
      semanas[lunesKey].total += parseFloat(g.monto) || 0
      if (!semanas[lunesKey].diasConGastos[g.fecha]) {
        semanas[lunesKey].diasConGastos[g.fecha] = { fecha: g.fecha, gastos: [], total: 0 }
      }
      semanas[lunesKey].diasConGastos[g.fecha].gastos.push(g)
      semanas[lunesKey].diasConGastos[g.fecha].total += parseFloat(g.monto) || 0
    }
    // Convertir diasConGastos a array ordenado y ordenar semanas desc
    return Object.values(semanas)
      .map(s => ({
        ...s,
        dias: Object.values(s.diasConGastos).sort((a, b) => b.fecha.localeCompare(a.fecha)),
      }))
      .sort((a, b) => b.key.localeCompare(a.key))
  })

  const gastosPorCategoria = computed(() => {
    const agrupado = {}
    for (const g of gastosMensuales.value) {
      const key = g.categoriaNombre || 'Otros'
      if (!agrupado[key]) {
        agrupado[key] = {
          nombre: key,
          color: g.categoriaColor || '#6b7280',
          icono: g.categoriaIcono || null,
          total: 0,
          cantidad: 0,
        }
      }
      agrupado[key].total += parseFloat(g.monto) || 0
      agrupado[key].cantidad++
    }
    const lista = Object.values(agrupado).sort((a, b) => b.total - a.total)
    const totalGeneral = lista.reduce((sum, c) => sum + c.total, 0)
    return lista.map(c => ({
      ...c,
      porcentaje: totalGeneral > 0 ? (c.total / totalGeneral) * 100 : 0,
    }))
  })

  function mesAnterior() {
    if (mesSeleccionado.value === 1) {
      mesSeleccionado.value = 12
      anioSeleccionado.value--
    } else {
      mesSeleccionado.value--
    }
  }

  function mesSiguiente() {
    if (mesSeleccionado.value === 12) {
      mesSeleccionado.value = 1
      anioSeleccionado.value++
    } else {
      mesSeleccionado.value++
    }
  }

  function irAMesActual() {
    const hoy = new Date()
    mesSeleccionado.value = hoy.getMonth() + 1
    anioSeleccionado.value = hoy.getFullYear()
  }

  function diaAnterior() {
    const d = new Date(fechaSeleccionada.value + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    fechaSeleccionada.value = d.toISOString().split('T')[0]
  }

  function diaSiguiente() {
    const d = new Date(fechaSeleccionada.value + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    fechaSeleccionada.value = d.toISOString().split('T')[0]
  }

  function irAHoy() {
    fechaSeleccionada.value = new Date().toISOString().split('T')[0]
  }

  function formatFechaDia(fechaStr) {
    const [anio, mes, dia] = fechaStr.split('-').map(Number)
    const fecha = new Date(anio, mes - 1, dia)
    const diaSemana = DIAS_SEMANA[fecha.getDay()]
    return `${diaSemana} ${dia}`
  }

  function formatRangoSemana(desde, hasta) {
    const [, , diaDesde] = desde.split('-').map(Number)
    const [, mesHasta, diaHasta] = hasta.split('-').map(Number)
    return `${diaDesde} - ${diaHasta} ${MESES[mesHasta - 1].substring(0, 3)}`
  }

  function getCategoriaById(id) {
    return categorias.value.find(c => c.id === id)
  }

  function normalizarTexto(texto) {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  function getCategoriaPorNombre(nombre) {
    const normalizado = normalizarTexto(nombre)
    return categorias.value.find(c =>
      normalizarTexto(c.nombre) === normalizado
    )
  }

  return {
    gastos, gastosMensuales, categorias, resumen, isLoading, isLoadingMensual, error,
    fechaSeleccionada, fechaFormateada, esHoy, gastosPorHora,
    mesSeleccionado, anioSeleccionado, mesFormateado, esMesActual,
    gastosPorDia, gastosPorSemana, gastosPorCategoria,
    fetchGastos, fetchResumen, fetchCategorias, fetchGastosMensuales,
    createGasto, createGastosBulk, updateGasto, deleteGasto,
    diaAnterior, diaSiguiente, irAHoy,
    mesAnterior, mesSiguiente, irAMesActual,
    getCategoriaById, getCategoriaPorNombre,
    formatFechaDia, formatRangoSemana,
  }
}
