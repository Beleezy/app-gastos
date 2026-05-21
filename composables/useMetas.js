// Submódulo Metas — integrado con backend (migración 0026).
// API pública compatible con la versión localStorage.

const STORAGE_ITEMS_LEGACY = 'metas.items.v1'
const STORAGE_MOVS_LEGACY = 'metas.movs.v1'

export const TIPOS_META = [
  { valor: 'ahorro', etiqueta: 'Ahorro', icono: '💰', signo: 1, hint: 'Acumular X soles' },
  { valor: 'deuda', etiqueta: 'Pagar deuda', icono: '💳', signo: 1, hint: 'Reducir X soles' },
  { valor: 'gasto_limite', etiqueta: 'Tope de gasto', icono: '🛑', signo: -1, hint: 'No superar X soles' },
]

export function useMetas() {
  const { apiFetch } = useApiFetch()

  const cache = useResourceCache(
    'metas',
    () => apiFetch('/api/metas'),
    { ttl: 60_000, initial: [] },
  )
  const items = cache.data

  // Movimientos: por demanda, cache por metaId.
  const movsPorMeta = useState('metas-movs', () => ({}))

  async function fetchItems(force = false) {
    return cache.refresh(force)
  }

  function movimientosDe(metaId) {
    return movsPorMeta.value[metaId] || []
  }

  async function fetchMovimientos(metaId) {
    const movs = await apiFetch(`/api/metas/${metaId}/movimientos`)
    movsPorMeta.value = { ...movsPorMeta.value, [metaId]: movs }
    return movs
  }

  // Cuando solo se necesita el progreso (no la lista), el endpoint /api/metas
  // ya lo devuelve agregado. progresoActual lee de allí; si hay movimientos
  // cargados, los suma localmente (más fresco tras un registrarMovimiento).
  function progresoActual(meta) {
    const movs = movsPorMeta.value[meta.id]
    if (movs?.length) return movs.reduce((s, m) => s + (Number(m.monto) || 0), 0)
    return Number(meta?.progreso) || 0
  }

  function porcentajeProgreso(meta) {
    const obj = Number(meta?.montoObjetivo) || 0
    if (obj <= 0) return 0
    return Math.min(100, Math.max(0, (progresoActual(meta) / obj) * 100))
  }

  function diasRestantes(meta) {
    if (!meta?.fechaLimite) return null
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const limite = new Date(meta.fechaLimite + 'T23:59:59')
    return Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24))
  }

  function estaCompletada(meta) {
    return porcentajeProgreso(meta) >= 100
  }

  const activas = computed(() => items.value.filter(m => !m.archivada))
  const archivadas = computed(() => items.value.filter(m => m.archivada))

  const totalObjetivo = computed(() =>
    activas.value.reduce((sum, m) => sum + (Number(m.montoObjetivo) || 0), 0),
  )
  const totalProgreso = computed(() =>
    activas.value.reduce((sum, m) => sum + progresoActual(m), 0),
  )

  async function crear(data) {
    const nueva = await apiFetch('/api/metas', {
      method: 'POST',
      body: {
        nombre: data.nombre,
        tipo: data.tipo || 'ahorro',
        montoObjetivo: data.montoObjetivo,
        fechaLimite: data.fechaLimite || null,
        icono: data.icono || '🎯',
        color: data.color || '#10b981',
      },
    })
    cache.set([nueva, ...items.value])
    return nueva
  }

  async function actualizar(id, parche) {
    const updated = await apiFetch(`/api/metas/${id}`, { method: 'PUT', body: parche })
    cache.set(items.value.map(m => m.id === id ? { ...m, ...updated, progreso: m.progreso ?? updated.progreso ?? 0 } : m))
    return updated
  }

  async function eliminar(id) {
    await apiFetch(`/api/metas/${id}`, { method: 'DELETE' })
    cache.set(items.value.filter(m => m.id !== id))
    const copia = { ...movsPorMeta.value }
    delete copia[id]
    movsPorMeta.value = copia
  }

  async function archivar(id, valor = true) {
    return actualizar(id, { archivada: valor })
  }

  async function registrarMovimiento(metaId, { monto, nota = '', fecha = null, origenTipo = 'manual', origenId = null }) {
    const mov = await apiFetch(`/api/metas/${metaId}/movimientos`, {
      method: 'POST',
      body: {
        monto,
        nota,
        fecha: fecha || new Date().toISOString().slice(0, 10),
        origenTipo,
        origenId,
      },
    })
    // Actualizar cache local de movimientos + progreso del item.
    const actuales = movsPorMeta.value[metaId] || []
    movsPorMeta.value = { ...movsPorMeta.value, [metaId]: [mov, ...actuales] }
    cache.set(items.value.map(m => m.id === metaId
      ? { ...m, progreso: (Number(m.progreso) || 0) + Number(mov.monto), countMovs: (m.countMovs || 0) + 1 }
      : m,
    ))
    return mov
  }

  async function eliminarMovimiento(movId) {
    await apiFetch(`/api/metas/movimientos/${movId}`, { method: 'DELETE' })
    // Re-sincronizar progreso: encontrar la meta del movimiento y recalcular.
    const copia = { ...movsPorMeta.value }
    let metaIdAfectada = null
    let montoEliminado = 0
    for (const [mid, movs] of Object.entries(copia)) {
      const mv = movs.find(m => m.id === movId)
      if (mv) {
        metaIdAfectada = mid
        montoEliminado = Number(mv.monto) || 0
        copia[mid] = movs.filter(m => m.id !== movId)
        break
      }
    }
    movsPorMeta.value = copia
    if (metaIdAfectada) {
      cache.set(items.value.map(m => m.id === metaIdAfectada
        ? { ...m, progreso: Math.max(0, (Number(m.progreso) || 0) - montoEliminado), countMovs: Math.max(0, (m.countMovs || 0) - 1) }
        : m,
      ))
    }
  }

  function porId(id) {
    return items.value.find(m => m.id === id) || null
  }

  // Migración localStorage → backend.
  async function migrarLocalStorageSiHaceFalta() {
    if (typeof localStorage === 'undefined') return
    const rawItems = localStorage.getItem(STORAGE_ITEMS_LEGACY)
    if (!rawItems) return
    let legacy
    try { legacy = JSON.parse(rawItems) } catch { return }
    if (!Array.isArray(legacy) || legacy.length === 0) {
      localStorage.removeItem(STORAGE_ITEMS_LEGACY)
      localStorage.removeItem(STORAGE_MOVS_LEGACY)
      return
    }
    await fetchItems(true)
    if (items.value.length > 0) {
      localStorage.removeItem(STORAGE_ITEMS_LEGACY)
      localStorage.removeItem(STORAGE_MOVS_LEGACY)
      return
    }
    // Cargar movimientos legacy y migrar metas + sus movimientos.
    let movsLegacy = []
    try { movsLegacy = JSON.parse(localStorage.getItem(STORAGE_MOVS_LEGACY) || '[]') || [] } catch {}
    let ok = 0
    for (const m of legacy) {
      try {
        const nueva = await crear({
          nombre: m.nombre, tipo: m.tipo,
          montoObjetivo: m.montoObjetivo,
          fechaLimite: m.fechaLimite || null,
          icono: m.icono, color: m.color,
        })
        const movsDeEsta = movsLegacy.filter(x => x.metaId === m.id)
        for (const mv of movsDeEsta) {
          await registrarMovimiento(nueva.id, {
            monto: mv.monto, nota: mv.nota, fecha: mv.fecha,
            origenTipo: 'manual',
          })
        }
        ok++
      } catch (e) {
        console.warn('[metas] migración item falló', e)
      }
    }
    if (ok === legacy.length) {
      localStorage.removeItem(STORAGE_ITEMS_LEGACY)
      localStorage.removeItem(STORAGE_MOVS_LEGACY)
    }
  }

  return {
    items, activas, archivadas, movs: movsPorMeta,
    totalObjetivo, totalProgreso,
    fetchItems, fetchMovimientos,
    crear, actualizar, eliminar, archivar,
    registrarMovimiento, eliminarMovimiento,
    movimientosDe, progresoActual, porcentajeProgreso, diasRestantes, estaCompletada,
    porId,
    migrarLocalStorageSiHaceFalta,
  }
}
