// Submódulo Presupuestos por categoría — integrado con backend (0026).
// API pública compatible con la versión localStorage.

const STORAGE_KEY_LEGACY = 'pcat.items.v1'

export const UMBRAL_ALERTA = 80
export const UMBRAL_CRITICO = 100

export function usePresupuestosCategoria() {
  const { apiFetch } = useApiFetch()

  // Catálogo de presupuestos.
  const cache = useResourceCache(
    'presupuestos-cat',
    () => apiFetch('/api/presupuestos-categoria'),
    { ttl: 60_000, initial: [] },
  )
  const items = cache.data

  // Estado con consumo del mes (devuelto por /estado).
  const estados = useState('pcat-estado', () => [])
  const ultimaCargaMes = useState('pcat-estado-mes', () => '')
  const cargando = ref(false)

  async function fetchItems(force = false) {
    return cache.refresh(force)
  }

  async function setPresupuesto({ categoriaId, montoMensual, alertaUmbral = UMBRAL_ALERTA }) {
    const row = await apiFetch('/api/presupuestos-categoria', {
      method: 'POST',
      body: { categoriaId, montoMensual, alertaUmbral },
    })
    const idx = items.value.findIndex((i) => i.categoriaId === categoriaId)
    if (idx === -1) cache.set([...items.value, row])
    else cache.set(items.value.map((i) => (i.categoriaId === categoriaId ? row : i)))
    // Invalidar el estado del mes (su % cambia con el nuevo límite).
    ultimaCargaMes.value = ''
    return row
  }

  async function eliminarPresupuesto(categoriaId) {
    await apiFetch(`/api/presupuestos-categoria/${categoriaId}`, { method: 'DELETE' })
    cache.set(items.value.filter((i) => i.categoriaId !== categoriaId))
    estados.value = estados.value.filter((e) => e.categoriaId !== categoriaId)
  }

  function porCategoria(categoriaId) {
    return items.value.find((i) => i.categoriaId === categoriaId) || null
  }

  // Carga consumo desde el endpoint /estado (un solo round-trip).
  async function cargarConsumo(mes, anio) {
    const key = `${anio}-${mes}`
    if (ultimaCargaMes.value === key && estados.value.length > 0) return
    cargando.value = true
    try {
      const data = await apiFetch('/api/presupuestos-categoria/estado', {
        query: { mes, anio },
      })
      estados.value = data || []
      ultimaCargaMes.value = key
    } catch (e) {
      console.warn('[presupuestos-cat] cargarConsumo falló:', e)
    } finally {
      cargando.value = false
    }
  }

  function consumoDe(categoriaId) {
    return estados.value.find((e) => e.categoriaId === categoriaId)?.consumido || 0
  }

  function porcentajeUsado(categoriaId) {
    const e = estados.value.find((x) => x.categoriaId === categoriaId)
    if (e) return e.porcentaje
    const p = porCategoria(categoriaId)
    if (!p || !p.montoMensual) return 0
    return (consumoDe(categoriaId) / p.montoMensual) * 100
  }

  function estadoSemaforo(categoriaId) {
    const e = estados.value.find((x) => x.categoriaId === categoriaId)
    if (e) return e.estado
    const pct = porcentajeUsado(categoriaId)
    const p = porCategoria(categoriaId)
    const alerta = p?.alertaUmbral ?? UMBRAL_ALERTA
    if (pct >= UMBRAL_CRITICO) return 'critico'
    if (pct >= alerta) return 'alerta'
    return 'ok'
  }

  const totalPresupuestado = computed(() =>
    items.value.reduce((sum, i) => sum + (Number(i.montoMensual) || 0), 0),
  )
  const totalConsumido = computed(() =>
    estados.value.reduce((sum, e) => sum + (Number(e.consumido) || 0), 0),
  )

  // Alertas activas (estado != ok). Útil para badge en BottomNav.
  const alertas = computed(() => estados.value.filter((e) => e.estado !== 'ok'))
  const countCriticas = computed(() => estados.value.filter((e) => e.estado === 'critico').length)

  // Migración localStorage → backend.
  async function migrarLocalStorageSiHaceFalta() {
    if (typeof localStorage === 'undefined') return
    const raw = localStorage.getItem(STORAGE_KEY_LEGACY)
    if (!raw) return
    let legacy
    try {
      legacy = JSON.parse(raw)
    } catch {
      return
    }
    if (!Array.isArray(legacy) || legacy.length === 0) {
      localStorage.removeItem(STORAGE_KEY_LEGACY)
      return
    }
    await fetchItems(true)
    if (items.value.length > 0) {
      localStorage.removeItem(STORAGE_KEY_LEGACY)
      return
    }
    let ok = 0
    for (const p of legacy) {
      try {
        await setPresupuesto({
          categoriaId: p.categoriaId,
          montoMensual: p.montoMensual,
          alertaUmbral: p.alertaUmbral || UMBRAL_ALERTA,
        })
        ok++
      } catch (e) {
        console.warn('[presupuestos-cat] migración item falló', e)
      }
    }
    if (ok === legacy.length) {
      localStorage.removeItem(STORAGE_KEY_LEGACY)
    }
  }

  return {
    items,
    estados,
    cargando,
    totalPresupuestado,
    totalConsumido,
    alertas,
    countCriticas,
    fetchItems,
    setPresupuesto,
    eliminarPresupuesto,
    porCategoria,
    cargarConsumo,
    consumoDe,
    porcentajeUsado,
    estadoSemaforo,
    migrarLocalStorageSiHaceFalta,
  }
}
