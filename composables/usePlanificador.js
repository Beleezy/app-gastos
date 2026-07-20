import { MESES } from '~/utils/constants'

export function usePlanificador() {
  const { apiFetch } = useApiFetch()
  const plan = useState('planificador-plan', () => null)
  const gastosPlaneados = useState('planificador-gastos', () => [])
  const gastosRealesPorCategoria = useState('planificador-reales', () => ({}))
  // Compartimos el estado de categorías con useCategorias/useGastos para que
  // los iconos/colores estén disponibles desde el primer render del planificador
  // sin tener que pasar por /registro primero.
  const { categorias, fetchCategorias: fetchCategoriasShared } = useCategorias()
  const mesAnteriorResumen = useState('planificador-mes-anterior', () => null)
  // Cache del resumen del mes anterior: el dato del mes pasado es prácticamente
  // inmutable (5 min de TTL es seguro).
  const mesAnteriorFetchedAt = useState('planificador-mes-anterior-ts', () => 0)
  const MES_ANTERIOR_TTL = 5 * 60 * 1000
  const isLoading = ref(false)
  const error = ref(null)

  const mesActual = useState('planificador-mes', () => new Date().getMonth() + 1)
  const anioActual = useState('planificador-anio', () => new Date().getFullYear())

  const nombreMes = computed(() => MESES[mesActual.value - 1] || '')
  const esHoy = computed(() => {
    const now = new Date()
    return mesActual.value === now.getMonth() + 1 && anioActual.value === now.getFullYear()
  })

  function _hoyISO() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const resumen = computed(() => {
    const presupuesto = plan.value?.montoPresupuesto || 0
    const totalPlanificado = gastosPlaneados.value.reduce(
      (s, g) => s + (Number(g.montoEstimado) || 0),
      0,
    )
    const pagados = gastosPlaneados.value.filter((g) => g.estado === 'pagado')
    const pendientes = gastosPlaneados.value.filter((g) => g.estado === 'pendiente')
    const hoy = _hoyISO()
    const vencidos = pendientes.filter((g) => g.fechaProbablePago && g.fechaProbablePago < hoy)
    const hoyItems = pendientes.filter((g) => g.fechaProbablePago === hoy)
    const porcentaje = presupuesto > 0 ? (totalPlanificado / presupuesto) * 100 : 0
    const gastoRealTotal = Object.values(gastosRealesPorCategoria.value).reduce((s, v) => s + v, 0)
    const porcentajeGastadoReal = presupuesto > 0 ? (gastoRealTotal / presupuesto) * 100 : 0
    return {
      presupuesto,
      totalPlanificado,
      saldoRestante: presupuesto - totalPlanificado,
      saldoReal: presupuesto - gastoRealTotal,
      porcentajeAsignado: Math.min(porcentaje, 100),
      porcentajeGastadoReal: Math.min(porcentajeGastadoReal, 100),
      excedeGastoReal: gastoRealTotal > presupuesto && presupuesto > 0,
      countPagados: pagados.length,
      countPendientes: pendientes.length,
      countVencidos: vencidos.length,
      countHoy: hoyItems.length,
      countTotal: gastosPlaneados.value.length,
    }
  })

  const gastosPorCategoria = computed(() => {
    const map = {}
    for (const g of gastosPlaneados.value) {
      const key = g.categoriaId
      if (!map[key]) {
        map[key] = {
          categoriaId: key,
          nombre: g.categoriaNombre || 'Sin categoría',
          icono: g.categoriaIcono,
          color: g.categoriaColor || '#6b7280',
          gastos: [],
          total: 0,
          totalReal: gastosRealesPorCategoria.value[key] || 0,
        }
      }
      map[key].gastos.push(g)
      map[key].total += Number(g.montoEstimado) || 0
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  })

  const totalGastoReal = computed(() => {
    return Object.values(gastosRealesPorCategoria.value).reduce((s, v) => s + v, 0)
  })

  // Analítica: proyección, ritmo diario, comparativas
  const analitica = computed(() => {
    const presupuesto = plan.value?.montoPresupuesto || 0
    const gastoReal = totalGastoReal.value
    const now = new Date()
    const esMesActual =
      mesActual.value === now.getMonth() + 1 && anioActual.value === now.getFullYear()
    const diasTotales = new Date(anioActual.value, mesActual.value, 0).getDate()
    const diaActual = esMesActual ? now.getDate() : diasTotales
    const diasRestantes = Math.max(0, diasTotales - diaActual)
    // Proyección lineal: ritmo_diario * días_totales
    const proyeccionFinMes = diaActual > 0 ? (gastoReal / diaActual) * diasTotales : 0
    const ritmoDiarioRecomendado =
      diasRestantes > 0 ? Math.max(0, (presupuesto - gastoReal) / diasRestantes) : 0
    const excedeProyeccion = proyeccionFinMes > presupuesto && presupuesto > 0 && esMesActual
    const excesoProyectado = Math.max(0, proyeccionFinMes - presupuesto)
    // Comparativa vs mes anterior
    const prev = mesAnteriorResumen.value
    let deltaPct = null
    let deltaAbs = null
    if (prev && prev.gastoReal > 0) {
      deltaAbs = gastoReal - prev.gastoReal
      deltaPct = (deltaAbs / prev.gastoReal) * 100
    }
    return {
      esMesActual,
      diasTotales,
      diaActual,
      diasRestantes,
      proyeccionFinMes,
      ritmoDiarioRecomendado,
      excedeProyeccion,
      excesoProyectado,
      deltaAbs,
      deltaPct,
      gastoRealMesAnterior: prev?.gastoReal ?? null,
    }
  })

  const datosGrafico = computed(() => {
    const total = resumen.value.totalPlanificado
    if (!(total > 0)) return []
    let acumulado = 0
    return gastosPorCategoria.value.map((cat) => {
      const porcentaje = (cat.total / total) * 100
      const offset = -acumulado
      acumulado += porcentaje
      return {
        nombre: cat.nombre,
        color: cat.color,
        porcentaje: Math.round(porcentaje * 10) / 10,
        dasharray: `${porcentaje} ${100 - porcentaje}`,
        dashoffset: offset,
        total: cat.total,
      }
    })
  })

  async function fetchMesAnterior() {
    let m = mesActual.value - 1
    let a = anioActual.value
    if (m === 0) {
      m = 12
      a -= 1
    }
    // SWR: si el resumen cacheado es del mismo (m, a) y aún es fresco,
    // no pedimos otra vez al backend. Datos de meses pasados son
    // efectivamente inmutables salvo edición manual.
    const cached = mesAnteriorResumen.value
    if (
      cached &&
      cached.mes === m &&
      cached.anio === a &&
      Date.now() - mesAnteriorFetchedAt.value < MES_ANTERIOR_TTL
    ) {
      return
    }
    try {
      const data = await apiFetch('/api/planificador', { query: { mes: m, anio: a } })
      const real = Object.values(data.gastosRealesPorCategoria || {}).reduce((s, v) => s + v, 0)
      const planificado = (data.gastos || []).reduce((s, g) => s + (g.montoEstimado || 0), 0)
      mesAnteriorResumen.value = {
        mes: m,
        anio: a,
        gastoReal: real,
        totalPlanificado: planificado,
        presupuesto: data.plan?.montoPresupuesto || 0,
      }
      mesAnteriorFetchedAt.value = Date.now()
    } catch (e) {
      mesAnteriorResumen.value = null
    }
  }

  async function fetchPlan() {
    isLoading.value = true
    error.value = null
    try {
      const data = await apiFetch('/api/planificador', {
        query: { mes: mesActual.value, anio: anioActual.value },
      })
      plan.value = data.plan
      gastosPlaneados.value = data.gastos
      gastosRealesPorCategoria.value = data.gastosRealesPorCategoria || {}
    } catch (e) {
      error.value = e.message || 'Error al cargar el plan'
    } finally {
      isLoading.value = false
    }
  }

  async function updatePresupuesto(monto) {
    if (!plan.value) return
    try {
      const updated = await apiFetch('/api/planificador', {
        method: 'PUT',
        body: { id: plan.value.id, montoPresupuesto: monto },
      })
      plan.value = updated
    } catch (e) {
      error.value = e.message || 'Error al actualizar presupuesto'
    }
  }

  async function createGastoPlaneado(data) {
    if (!plan.value) return
    try {
      const creado = await apiFetch('/api/planificador/gastos', {
        method: 'POST',
        body: { ...data, planMensualId: plan.value.id },
      })
      // Optimistic update: si es un único gasto (no recurrente), basta
      // con añadirlo al array local. Si es recurrente, el endpoint creó
      // varias instancias en meses futuros y necesitamos re-fetch para
      // mantener `gastosPlaneados` consistente con el mes actual.
      if (creado && !data.esRecurrente) {
        gastosPlaneados.value = [
          ...gastosPlaneados.value,
          {
            ...creado,
            montoEstimado: parseFloat(creado.montoEstimado),
          },
        ]
      } else {
        await fetchPlan()
      }
    } catch (e) {
      error.value = e.message || 'Error al crear gasto'
      throw e
    }
  }

  async function updateGastoPlaneado(id, data) {
    try {
      // data puede incluir alcanceEdicion: 'solo' | 'futuros' para recurrentes
      const actualizado = await apiFetch(`/api/planificador/gastos/${id}`, {
        method: 'PUT',
        body: data,
      })
      // Optimistic update: si alcanceEdicion='solo' (o no es recurrente),
      // basta con reemplazar el item local. Para 'futuros' tocó otros
      // meses, así que conservador re-fetch.
      if (actualizado && data.alcanceEdicion !== 'futuros') {
        gastosPlaneados.value = gastosPlaneados.value.map((g) =>
          g.id === id
            ? { ...g, ...actualizado, montoEstimado: parseFloat(actualizado.montoEstimado) }
            : g,
        )
      } else {
        await fetchPlan()
      }
    } catch (e) {
      error.value = e.message || 'Error al actualizar gasto'
    }
  }

  async function deleteGastoPlaneado(id, eliminarFuturos = false) {
    try {
      await apiFetch(`/api/planificador/gastos/${id}`, {
        method: 'DELETE',
        query: eliminarFuturos ? { futuros: 'true' } : {},
      })
      gastosPlaneados.value = gastosPlaneados.value.filter((g) => g.id !== id)
    } catch (e) {
      error.value = e.message || 'Error al eliminar gasto'
    }
  }

  // Soft-delete con ventana de undo: remueve de UI inmediatamente,
  // difiere la eliminación en backend, permite cancelar.
  const _pendingDeletes = new Map()
  function softDeleteGastoPlaneado(id, delayMs = 5000) {
    const gasto = gastosPlaneados.value.find((g) => g.id === id)
    if (!gasto) return null
    const index = gastosPlaneados.value.findIndex((g) => g.id === id)
    gastosPlaneados.value = gastosPlaneados.value.filter((g) => g.id !== id)
    const timeoutId = setTimeout(async () => {
      _pendingDeletes.delete(id)
      try {
        await apiFetch(`/api/planificador/gastos/${id}`, { method: 'DELETE' })
      } catch (e) {
        // Restaurar si el backend falla
        gastosPlaneados.value = [
          ...gastosPlaneados.value.slice(0, index),
          gasto,
          ...gastosPlaneados.value.slice(index),
        ]
        error.value = e.message || 'Error al eliminar gasto'
      }
    }, delayMs)
    _pendingDeletes.set(id, { gasto, index, timeoutId })
    return {
      undo: () => {
        const entry = _pendingDeletes.get(id)
        if (!entry) return false
        clearTimeout(entry.timeoutId)
        _pendingDeletes.delete(id)
        const idx = Math.min(entry.index, gastosPlaneados.value.length)
        gastosPlaneados.value = [
          ...gastosPlaneados.value.slice(0, idx),
          entry.gasto,
          ...gastosPlaneados.value.slice(idx),
        ]
        return true
      },
    }
  }

  async function toggleEstado(gasto) {
    const nuevoEstado = gasto.estado === 'pagado' ? 'pendiente' : 'pagado'
    await updateGastoPlaneado(gasto.id, { estado: nuevoEstado })
  }

  async function registrarGastoEnRegistro(id, data) {
    try {
      const result = await apiFetch(`/api/planificador/gastos/${id}/registro`, {
        method: 'POST',
        body: data,
      })
      await fetchPlan()
      return result
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al registrar el gasto'
      throw e
    }
  }

  async function fetchCategorias(force = false) {
    try {
      await fetchCategoriasShared(force)
    } catch (e) {
      error.value = e.message || 'Error al cargar categorías'
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

  function diasEnMes() {
    return new Date(anioActual.value, mesActual.value, 0).getDate()
  }

  async function duplicarMes(mesOrigen, anioOrigen) {
    try {
      const result = await apiFetch('/api/planificador/duplicar', {
        method: 'POST',
        body: {
          mesOrigen,
          anioOrigen,
          mesDestino: mesActual.value,
          anioDestino: anioActual.value,
        },
      })
      await fetchPlan()
      return result
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al duplicar mes'
      throw e
    }
  }

  return {
    plan,
    gastosPlaneados,
    gastosRealesPorCategoria,
    categorias,
    isLoading,
    error,
    mesActual,
    anioActual,
    nombreMes,
    esHoy,
    resumen,
    gastosPorCategoria,
    datosGrafico,
    totalGastoReal,
    analitica,
    mesAnteriorResumen,
    fetchMesAnterior,
    fetchPlan,
    updatePresupuesto,
    createGastoPlaneado,
    updateGastoPlaneado,
    deleteGastoPlaneado,
    softDeleteGastoPlaneado,
    toggleEstado,
    registrarGastoEnRegistro,
    fetchCategorias,
    mesSiguiente,
    mesAnterior,
    diasEnMes,
    duplicarMes,
  }
}
