import { useDebouncedRef } from './useDebounceFn'

export function useAhorrosFilters({ ahorrosList, esMesActual }) {
  const busquedaAhorro = ref('')
  const medioFiltro = ref(null)
  const rangoRapido = ref('mes')

  const busquedaDebounced = useDebouncedRef(busquedaAhorro, 150)

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

  const ahorrosFiltrados = computed(() => {
    const q = busquedaDebounced.value.toLowerCase()
    return ahorrosList.value.filter(a => {
      const concepto = (a.concepto || a.medioNombre || '').toLowerCase()
      const matchBusqueda = !q || concepto.includes(q)
      const matchMedio = !medioFiltro.value || a.medioAhorroId === medioFiltro.value
      const matchRango = fechaDentroRango(a.fecha)
      return matchBusqueda && matchMedio && matchRango
    })
  })

  const totalFiltrado = computed(() =>
    ahorrosFiltrados.value.reduce((sum, a) => sum + Number(a.monto || 0), 0)
  )

  const porMedioFiltrado = computed(() => {
    const grupos = new Map()
    for (const a of ahorrosFiltrados.value) {
      const key = a.medioAhorroId ?? 0
      if (!grupos.has(key)) {
        grupos.set(key, {
          medioAhorroId: a.medioAhorroId,
          medioNombre: a.medioNombre,
          medioIcono: a.medioIcono,
          medioColor: a.medioColor,
          total: 0,
          registros: [],
        })
      }
      const g = grupos.get(key)
      g.total += Number(a.monto || 0)
      g.registros.push(a)
    }
    return Array.from(grupos.values()).sort((a, b) => b.total - a.total)
  })

  const tieneFiltrosActivos = computed(() =>
    !!busquedaAhorro.value || !!medioFiltro.value || rangoRapido.value !== 'mes'
  )

  const conteoFiltrosActivos = computed(() => {
    let n = 0
    if (busquedaAhorro.value) n++
    if (medioFiltro.value) n++
    if (rangoRapido.value !== 'mes') n++
    return n
  })

  function limpiarFiltros() {
    busquedaAhorro.value = ''
    medioFiltro.value = null
    rangoRapido.value = 'mes'
  }

  return {
    busquedaAhorro, medioFiltro, rangoRapido, rangosRapidos,
    ahorrosFiltrados, totalFiltrado, porMedioFiltrado,
    tieneFiltrosActivos, conteoFiltrosActivos, limpiarFiltros,
  }
}
