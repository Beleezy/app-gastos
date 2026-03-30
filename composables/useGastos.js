const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function useGastos() {
  const gastos = useState('registro-gastos', () => [])
  const categorias = useState('registro-categorias', () => [])
  const resumen = useState('registro-resumen', () => ({ totalDia: 0, totalMes: 0 }))
  const isLoading = ref(false)
  const error = ref(null)

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

  async function fetchGastos() {
    isLoading.value = true
    error.value = null
    try {
      const data = await $fetch('/api/gastos', {
        query: { fecha: fechaSeleccionada.value }
      })
      gastos.value = data
    } catch (e) {
      error.value = e.message || 'Error al cargar gastos'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchResumen() {
    const fecha = fechaSeleccionada.value
    const [anio, mes] = fecha.split('-')
    try {
      const data = await $fetch('/api/gastos/resumen', {
        query: { fecha, mes, anio }
      })
      resumen.value = data
    } catch (e) {
      // silently fail
    }
  }

  async function fetchCategorias() {
    try {
      categorias.value = await $fetch('/api/categorias')
    } catch (e) {
      error.value = e.message || 'Error al cargar categorías'
    }
  }

  async function createGasto(data) {
    try {
      const nuevo = await $fetch('/api/gastos', {
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
      const nuevos = await $fetch('/api/gastos/bulk', {
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
      const updated = await $fetch(`/api/gastos/${id}`, {
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
      await $fetch(`/api/gastos/${id}`, { method: 'DELETE' })
      gastos.value = gastos.value.filter(g => g.id !== id)
      await fetchResumen()
    } catch (e) {
      error.value = e.message || 'Error al eliminar gasto'
      throw e
    }
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

  function getCategoriaById(id) {
    return categorias.value.find(c => c.id === id)
  }

  function getCategoriaPorNombre(nombre) {
    return categorias.value.find(c =>
      c.nombre.toLowerCase() === nombre.toLowerCase()
    )
  }

  return {
    gastos, categorias, resumen, isLoading, error,
    fechaSeleccionada, fechaFormateada, esHoy, gastosPorHora,
    fetchGastos, fetchResumen, fetchCategorias,
    createGasto, createGastosBulk, updateGasto, deleteGasto,
    diaAnterior, diaSiguiente, irAHoy,
    getCategoriaById, getCategoriaPorNombre,
  }
}
