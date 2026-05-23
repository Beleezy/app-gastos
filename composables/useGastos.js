import { DIAS_SEMANA, MESES } from '~/utils/constants'

export function useGastos() {
  const { apiFetch } = useApiFetch()
  // Compartimos el estado de categorías con useCategorias / usePlanificador
  // bajo la misma key 'registro-categorias' para que un solo fetch sirva
  // a todas las páginas y se beneficie del SWR de useResourceCache.
  const { categorias, fetchCategorias: fetchCategoriasShared } = useCategorias()
  const gastos = useState('registro-gastos', () => [])
  const gastosMensuales = useState('registro-gastos-mensuales', () => [])
  const resumen = useState('registro-resumen', () => ({ totalDia: 0, totalMes: 0 }))
  const isLoading = ref(false)
  const isLoadingMensual = ref(false)
  const error = ref(null)

  // Usar Lima/Peru para que coincida con form.fecha (FormGastoManual hace
  // fechaHoy() de useFechaPeru). Si dejamos `toISOString` el server UTC
  // puede estar en el dia siguiente y la fecha seleccionada no coincide
  // con la del gasto recien creado — el optimistic add lo filtra y el
  // historial se ve vacio aunque la API lo persistio.
  const { fechaHoy } = useFechaPeru()
  const partesHoyPe = () => {
    const [a, m, d] = fechaHoy().split('-').map(Number)
    return { mes: m, anio: a }
  }
  const mesSeleccionado = useState('registro-mes', () => partesHoyPe().mes)
  const anioSeleccionado = useState('registro-anio', () => partesHoyPe().anio)
  const fechaSeleccionada = useState('registro-fecha', () => fechaHoy())

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
    return fechaSeleccionada.value === fechaHoy()
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

  async function fetchCategorias(force = false) {
    try {
      await fetchCategoriasShared(force)
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

  async function createGastosBulk(gastosData, transcripcionVoz, metodoRegistro = 'voz') {
    try {
      const nuevos = await apiFetch('/api/gastos/bulk', {
        method: 'POST',
        body: { gastos: gastosData, transcripcionVoz, metodoRegistro }
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

  async function updateGastosBulk(ids, campos) {
    if (!ids?.length) return { actualizados: 0, gastos: [] }
    try {
      const res = await apiFetch('/api/gastos/bulk', {
        method: 'PUT',
        body: { ids, campos },
      })
      // Actualizar estado local
      const gastosMap = Object.fromEntries((res.gastos || []).map(g => [g.id, g]))
      gastos.value = gastos.value.map(g => gastosMap[g.id] || g)
      gastosMensuales.value = gastosMensuales.value.map(g => gastosMap[g.id] || g)
      await fetchResumen()
      return res
    } catch (e) {
      error.value = e.message || 'Error al actualizar gastos'
      throw e
    }
  }

  async function deleteGastosBulk(ids) {
    if (!ids?.length) return { eliminados: 0 }
    try {
      const res = await apiFetch('/api/gastos/bulk', {
        method: 'DELETE',
        body: { ids },
      })
      const idsSet = new Set(res.ids || ids)
      gastos.value = gastos.value.filter(g => !idsSet.has(g.id))
      gastosMensuales.value = gastosMensuales.value.filter(g => !idsSet.has(g.id))
      await fetchResumen()
      return res
    } catch (e) {
      error.value = e.message || 'Error al eliminar gastos'
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

  // Hash barato del array que identifica si cambió: longitud + último id +
  // updatedAt agregado. Evita recalcular agrupaciones costosas cuando el
  // array no cambió (re-renders por otros estados).
  function _hashGastosMensuales() {
    const arr = gastosMensuales.value
    if (!arr.length) return '0'
    return `${arr.length}:${arr[0]?.id || ''}:${arr[arr.length - 1]?.id || ''}:${arr[0]?.updatedAt || ''}`
  }

  const _diaCache = shallowRef({ key: '', data: [] })
  const _semanaCache = shallowRef({ key: '', data: [] })
  const _categoriaCache = shallowRef({ key: '', data: [] })

  // Agrupa gastos mensuales por día
  const gastosPorDia = computed(() => {
    const key = _hashGastosMensuales()
    if (_diaCache.value.key === key) return _diaCache.value.data
    const agrupado = {}
    for (const g of gastosMensuales.value) {
      if (!agrupado[g.fecha]) {
        agrupado[g.fecha] = { fecha: g.fecha, gastos: [], total: 0 }
      }
      agrupado[g.fecha].gastos.push(g)
      agrupado[g.fecha].total += parseFloat(g.monto) || 0
    }
    const data = Object.values(agrupado).sort((a, b) => b.fecha.localeCompare(a.fecha))
    _diaCache.value = { key, data }
    return data
  })

  // Agrupa gastos mensuales por semana
  const gastosPorSemana = computed(() => {
    const key = _hashGastosMensuales()
    if (_semanaCache.value.key === key) return _semanaCache.value.data
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
    const data = Object.values(semanas)
      .map(s => ({
        ...s,
        dias: Object.values(s.diasConGastos).sort((a, b) => b.fecha.localeCompare(a.fecha)),
      }))
      .sort((a, b) => b.key.localeCompare(a.key))
    _semanaCache.value = { key, data }
    return data
  })

  const gastosPorCategoria = computed(() => {
    const key = _hashGastosMensuales()
    if (_categoriaCache.value.key === key) return _categoriaCache.value.data
    const agrupado = {}
    for (const g of gastosMensuales.value) {
      const k = g.categoriaNombre || 'Otros'
      if (!agrupado[k]) {
        agrupado[k] = {
          nombre: k,
          color: g.categoriaColor || '#6b7280',
          icono: g.categoriaIcono || null,
          total: 0,
          cantidad: 0,
        }
      }
      agrupado[k].total += parseFloat(g.monto) || 0
      agrupado[k].cantidad++
    }
    const lista = Object.values(agrupado).sort((a, b) => b.total - a.total)
    const totalGeneral = lista.reduce((sum, c) => sum + c.total, 0)
    const data = lista.map(c => ({
      ...c,
      porcentaje: totalGeneral > 0 ? (c.total / totalGeneral) * 100 : 0,
    }))
    _categoriaCache.value = { key, data }
    return data
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
    createGasto, createGastosBulk, updateGasto, updateGastosBulk, deleteGasto, deleteGastosBulk,
    diaAnterior, diaSiguiente, irAHoy,
    mesAnterior, mesSiguiente, irAMesActual,
    getCategoriaById, getCategoriaPorNombre,
    formatFechaDia, formatRangoSemana,
  }
}
