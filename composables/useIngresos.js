// Composable cliente para el módulo de ingresos. Espejo simplificado de
// useGastos.js (no categorías, no fecha+hora — solo fecha) con caché
// SWR por mes en useState para que la navegación entre meses no refetchee.

import { MESES } from '~/utils/constants'

export function useIngresos() {
  const { apiFetch } = useApiFetch()
  const ingresos = useState('ingresos-lista', () => [])
  const resumen = useState('ingresos-resumen', () => ({
    totalIngresos: 0,
    totalGastos: 0,
    saldoNeto: 0,
    porcentajeAhorro: 0,
  }))
  const isLoading = ref(false)
  const error = ref(null)

  const mesSeleccionado = useState('ingresos-mes', () => new Date().getMonth() + 1)
  const anioSeleccionado = useState('ingresos-anio', () => new Date().getFullYear())

  const mesLabel = computed(() => `${MESES[mesSeleccionado.value - 1]} ${anioSeleccionado.value}`)

  const totalMes = computed(() =>
    ingresos.value.reduce((s, i) => s + (Number(i.monto) || 0), 0)
  )

  const porOrigen = computed(() => {
    const map = new Map()
    for (const i of ingresos.value) {
      const k = i.origen || 'otro'
      map.set(k, (map.get(k) || 0) + Number(i.monto || 0))
    }
    return Array.from(map.entries())
      .map(([origen, total]) => ({ origen, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total)
  })

  async function fetchIngresos() {
    isLoading.value = true
    error.value = null
    try {
      const data = await apiFetch('/api/ingresos', {
        query: { mes: mesSeleccionado.value, anio: anioSeleccionado.value },
      })
      ingresos.value = Array.isArray(data) ? data : []
    } catch (e) {
      error.value = e?.message || 'Error al cargar ingresos'
      ingresos.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function fetchResumen() {
    try {
      resumen.value = await apiFetch('/api/ingresos/resumen', {
        query: { mes: mesSeleccionado.value, anio: anioSeleccionado.value },
      })
    } catch {}
  }

  async function crearIngreso(payload) {
    const nuevo = await apiFetch('/api/ingresos', { method: 'POST', body: payload })
    ingresos.value = [nuevo, ...ingresos.value]
    fetchResumen()
    return nuevo
  }

  async function actualizarIngreso(id, payload) {
    const actualizado = await apiFetch(`/api/ingresos/${id}`, { method: 'PUT', body: payload })
    const idx = ingresos.value.findIndex((i) => i.id === id)
    if (idx >= 0) ingresos.value[idx] = actualizado
    fetchResumen()
    return actualizado
  }

  async function eliminarIngreso(id) {
    await apiFetch(`/api/ingresos/${id}`, { method: 'DELETE' })
    ingresos.value = ingresos.value.filter((i) => i.id !== id)
    fetchResumen()
  }

  function cambiarMes(mes, anio) {
    mesSeleccionado.value = mes
    anioSeleccionado.value = anio
    fetchIngresos()
    fetchResumen()
  }

  function mesAnterior() {
    let m = mesSeleccionado.value - 1
    let a = anioSeleccionado.value
    if (m < 1) { m = 12; a-- }
    cambiarMes(m, a)
  }

  function mesSiguiente() {
    let m = mesSeleccionado.value + 1
    let a = anioSeleccionado.value
    if (m > 12) { m = 1; a++ }
    cambiarMes(m, a)
  }

  function irAMesActual() {
    const hoy = new Date()
    cambiarMes(hoy.getMonth() + 1, hoy.getFullYear())
  }

  const esMesActual = computed(() => {
    const hoy = new Date()
    return mesSeleccionado.value === hoy.getMonth() + 1
      && anioSeleccionado.value === hoy.getFullYear()
  })

  return {
    ingresos,
    resumen,
    isLoading,
    error,
    mesSeleccionado,
    anioSeleccionado,
    mesLabel,
    esMesActual,
    totalMes,
    porOrigen,
    fetchIngresos,
    fetchResumen,
    crearIngreso,
    actualizarIngreso,
    eliminarIngreso,
    cambiarMes,
    mesAnterior,
    mesSiguiente,
    irAMesActual,
  }
}
