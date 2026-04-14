import { MESES } from '~/utils/constants'

export function usePlanificador() {
  const { apiFetch } = useApiFetch()
  const plan = useState('planificador-plan', () => null)
  const gastosPlaneados = useState('planificador-gastos', () => [])
  const gastosFuturos = useState('planificador-futuros', () => [])
  const resumenFuturos = useState('planificador-futuros-resumen', () => ({
    totalProyectos: 0,
    totalDetalles: 0,
    totalOpciones: 0,
    proyectosConReferencia: 0,
    totalMinimo: 0,
    totalMaximo: 0,
    totalPromedio: 0,
    promedioPorProyecto: 0,
    destacados: [],
  }))
  const gastosRealesPorCategoria = useState('planificador-reales', () => ({}))
  const categorias = useState('planificador-categorias', () => [])
  const isLoading = ref(false)
  const error = ref(null)

  const mesActual = useState('planificador-mes', () => new Date().getMonth() + 1)
  const anioActual = useState('planificador-anio', () => new Date().getFullYear())

  const nombreMes = computed(() => MESES[mesActual.value - 1] || '')
  const esHoy = computed(() => {
    const now = new Date()
    return mesActual.value === now.getMonth() + 1 && anioActual.value === now.getFullYear()
  })

  const resumen = computed(() => {
    const presupuesto = plan.value?.montoPresupuesto || 0
    const totalPlanificado = gastosPlaneados.value.reduce((s, g) => s + g.montoEstimado, 0)
    const pagados = gastosPlaneados.value.filter(g => g.estado === 'pagado')
    const pendientes = gastosPlaneados.value.filter(g => g.estado === 'pendiente')
    const porcentaje = presupuesto > 0 ? (totalPlanificado / presupuesto * 100) : 0
    return {
      presupuesto,
      totalPlanificado,
      saldoRestante: presupuesto - totalPlanificado,
      porcentajeAsignado: Math.min(porcentaje, 100),
      countPagados: pagados.length,
      countPendientes: pendientes.length,
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
      map[key].total += g.montoEstimado
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  })

  const totalGastoReal = computed(() => {
    return Object.values(gastosRealesPorCategoria.value).reduce((s, v) => s + v, 0)
  })

  const datosGrafico = computed(() => {
    const total = resumen.value.totalPlanificado
    if (total === 0) return []
    let acumulado = 0
    return gastosPorCategoria.value.map(cat => {
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

  async function fetchPlan() {
    isLoading.value = true
    error.value = null
    try {
      const data = await apiFetch('/api/planificador', {
        query: { mes: mesActual.value, anio: anioActual.value }
      })
      plan.value = data.plan
      gastosPlaneados.value = data.gastos
      gastosFuturos.value = data.gastosFuturos || []
      resumenFuturos.value = data.resumenFuturos || {
        totalProyectos: 0,
        totalDetalles: 0,
        totalOpciones: 0,
        proyectosConReferencia: 0,
        totalMinimo: 0,
        totalMaximo: 0,
        totalPromedio: 0,
        promedioPorProyecto: 0,
        destacados: [],
      }
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
        body: { id: plan.value.id, montoPresupuesto: monto }
      })
      plan.value = updated
    } catch (e) {
      error.value = e.message || 'Error al actualizar presupuesto'
    }
  }

  async function createGastoPlaneado(data) {
    if (!plan.value) return
    try {
      await apiFetch('/api/planificador/gastos', {
        method: 'POST',
        body: { ...data, planMensualId: plan.value.id }
      })
      await fetchPlan()
    } catch (e) {
      error.value = e.message || 'Error al crear gasto'
      throw e
    }
  }

  async function updateGastoPlaneado(id, data) {
    try {
      await apiFetch(`/api/planificador/gastos/${id}`, {
        method: 'PUT',
        body: data
      })
      await fetchPlan()
    } catch (e) {
      error.value = e.message || 'Error al actualizar gasto'
    }
  }

  async function deleteGastoPlaneado(id, eliminarFuturos = false) {
    try {
      await apiFetch(`/api/planificador/gastos/${id}`, {
        method: 'DELETE',
        query: eliminarFuturos ? { futuros: 'true' } : {}
      })
      gastosPlaneados.value = gastosPlaneados.value.filter(g => g.id !== id)
    } catch (e) {
      error.value = e.message || 'Error al eliminar gasto'
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

  async function createGastoFuturo(data) {
    try {
      await apiFetch('/api/planificador/futuros', {
        method: 'POST',
        body: data,
      })
      await fetchPlan()
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
      await fetchPlan()
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al actualizar gasto futuro'
      throw e
    }
  }

  async function decidirOpcionFutura(proyectoId, detalleId, data) {
    try {
      const result = await apiFetch(`/api/planificador/futuros/${proyectoId}/detalles/${detalleId}/decidir`, {
        method: 'POST',
        body: data,
      })
      await fetchPlan()
      return result
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al decidir la opcion'
      throw e
    }
  }

  async function deleteGastoFuturo(id) {
    try {
      await apiFetch(`/api/planificador/futuros/${id}`, {
        method: 'DELETE',
      })
      await fetchPlan()
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al eliminar gasto futuro'
      throw e
    }
  }

  async function fetchCategorias() {
    try {
      categorias.value = await apiFetch('/api/categorias')
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
        }
      })
      await fetchPlan()
      return result
    } catch (e) {
      error.value = e.data?.message || e.message || 'Error al duplicar mes'
      throw e
    }
  }

  return {
    plan, gastosPlaneados, gastosFuturos, resumenFuturos, gastosRealesPorCategoria, categorias, isLoading, error,
    mesActual, anioActual, nombreMes, esHoy,
    resumen, gastosPorCategoria, datosGrafico, totalGastoReal,
    fetchPlan, updatePresupuesto,
    createGastoPlaneado, updateGastoPlaneado, deleteGastoPlaneado,
    toggleEstado, registrarGastoEnRegistro,
    createGastoFuturo, updateGastoFuturo, deleteGastoFuturo, decidirOpcionFutura,
    fetchCategorias, mesSiguiente, mesAnterior, diasEnMes,
    duplicarMes,
  }
}
