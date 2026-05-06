import { useDebouncedRef } from './useDebounce'

export function useRegistroFilters({ gastosPorDia, gastosPorSemana, esMesActual }) {
  const busquedaGasto = ref('')
  const categoriaFiltro = ref(null)
  const rangoRapido = ref('mes') // 'hoy' | '7d' | 'mes'

  const busquedaDebounced = useDebouncedRef(busquedaGasto, 150)

  const rangosRapidos = computed(() => {
    const base = [{ value: 'mes', label: 'Mes' }]
    if (esMesActual.value) {
      return [
        { value: 'hoy', label: 'Hoy' },
        { value: '7d', label: '7 días' },
        ...base,
      ]
    }
    return base
  })

  // Si salimos del mes actual y el rango es relativo, normalizar
  watch(esMesActual, (v) => {
    if (!v && rangoRapido.value !== 'mes') rangoRapido.value = 'mes'
  })

  function fechaDentroRango(fecha) {
    if (rangoRapido.value === 'mes') return true
    const hoy = new Date()
    const d = new Date(`${fecha}T00:00:00`)
    if (rangoRapido.value === 'hoy') {
      return d.toDateString() === hoy.toDateString()
    }
    if (rangoRapido.value === '7d') {
      const desde = new Date(hoy)
      desde.setDate(desde.getDate() - 6)
      desde.setHours(0, 0, 0, 0)
      return d >= desde && d <= hoy
    }
    return true
  }

  function filtrarGastos(gastosArr) {
    const q = busquedaDebounced.value.toLowerCase()
    return gastosArr.filter(g => {
      const matchBusqueda = !q || g.concepto.toLowerCase().includes(q)
      const matchCategoria = !categoriaFiltro.value || g.categoriaId === categoriaFiltro.value
      const matchRango = fechaDentroRango(g.fecha)
      return matchBusqueda && matchCategoria && matchRango
    })
  }

  const gastosPorDiaFiltrados = computed(() => {
    return gastosPorDia.value
      .map(dia => {
        const gastosFiltrados = filtrarGastos(dia.gastos)
        return {
          ...dia,
          gastos: gastosFiltrados,
          total: gastosFiltrados.reduce((sum, g) => sum + Number(g.monto || 0), 0),
        }
      })
      .filter(dia => dia.gastos.length > 0)
  })

  const gastosPorSemanaFiltrados = computed(() => {
    return gastosPorSemana.value
      .map(semana => {
        const diasFiltrados = semana.dias
          .map(dia => {
            const gastosFiltrados = filtrarGastos(dia.gastos)
            return {
              ...dia,
              gastos: gastosFiltrados,
              total: gastosFiltrados.reduce((sum, g) => sum + Number(g.monto || 0), 0),
            }
          })
          .filter(dia => dia.gastos.length > 0)
        return {
          ...semana,
          dias: diasFiltrados,
          total: diasFiltrados.reduce((sum, d) => sum + d.total, 0),
        }
      })
      .filter(semana => semana.dias.length > 0)
  })

  const tieneFiltrosActivos = computed(() =>
    !!busquedaGasto.value || !!categoriaFiltro.value || rangoRapido.value !== 'mes'
  )

  const conteoFiltrosActivos = computed(() => {
    let n = 0
    if (busquedaGasto.value) n++
    if (categoriaFiltro.value) n++
    if (rangoRapido.value !== 'mes') n++
    return n
  })

  function limpiarFiltros() {
    busquedaGasto.value = ''
    categoriaFiltro.value = null
    rangoRapido.value = 'mes'
  }

  return {
    busquedaGasto, categoriaFiltro, rangoRapido, rangosRapidos,
    gastosPorDiaFiltrados, gastosPorSemanaFiltrados,
    tieneFiltrosActivos, conteoFiltrosActivos, limpiarFiltros,
  }
}
