// Submódulo Etiquetas — integrado con backend (0026).
// API pública compatible con la versión localStorage.

const STORAGE_ITEMS_LEGACY = 'etq.items.v1'
const STORAGE_ASIGN_LEGACY = 'etq.asign.v1'

export const COLORES_ETIQUETA = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#10b981', '#14b8a6', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#a855f7', '#ec4899',
]

export function useEtiquetas() {
  const { apiFetch } = useApiFetch()

  const cache = useResourceCache(
    'etiquetas',
    () => apiFetch('/api/etiquetas'),
    { ttl: 120_000, initial: [] },
  )
  const items = cache.data

  // Asignaciones indexadas por (recursoTipo, recursoId).
  // Estructura: { gasto: { [id]: [etiquetaId...] }, planificado: {}, futuro: {} }
  const asignaciones = useState('etiquetas-asign', () => ({ gasto: {}, planificado: {}, futuro: {} }))
  const ultimoFetchAsign = useState('etiquetas-asign-ts', () => 0)

  async function fetchItems(force = false) {
    return cache.refresh(force)
  }

  async function fetchAsignaciones(force = false) {
    if (!force && Date.now() - ultimoFetchAsign.value < 60_000) return asignaciones.value
    const data = await apiFetch('/api/etiquetas/asignaciones')
    asignaciones.value = data || { gasto: {}, planificado: {}, futuro: {} }
    ultimoFetchAsign.value = Date.now()
    return asignaciones.value
  }

  async function crear({ nombre, color = '#3b82f6' }) {
    try {
      const nueva = await apiFetch('/api/etiquetas', {
        method: 'POST',
        body: { nombre, color },
      })
      cache.set([nueva, ...items.value])
      return nueva
    } catch (e) {
      if (e?.response?.status === 409 || e?.statusCode === 409) return null
      throw e
    }
  }

  async function actualizar(id, parche) {
    const updated = await apiFetch(`/api/etiquetas/${id}`, { method: 'PUT', body: parche })
    cache.set(items.value.map(e => e.id === id ? { ...e, ...updated } : e))
  }

  async function eliminar(id) {
    await apiFetch(`/api/etiquetas/${id}`, { method: 'DELETE' })
    cache.set(items.value.filter(e => e.id !== id))
    // Limpiar asignaciones cacheadas localmente.
    const copia = { ...asignaciones.value }
    for (const tipo of Object.keys(copia)) {
      for (const rid of Object.keys(copia[tipo] || {})) {
        copia[tipo][rid] = (copia[tipo][rid] || []).filter(eid => eid !== id)
        if (!copia[tipo][rid].length) delete copia[tipo][rid]
      }
    }
    asignaciones.value = copia
  }

  function porId(id) { return items.value.find(e => e.id === id) || null }

  function etiquetasDe(tipo, recursoId) {
    const ids = asignaciones.value?.[tipo]?.[recursoId] || []
    return ids.map(id => porId(id)).filter(Boolean)
  }

  async function asignar(tipo, recursoId, etiquetaId) {
    await apiFetch('/api/etiquetas/asignar', {
      method: 'POST',
      body: { etiquetaId, recursoTipo: tipo, recursoId },
    })
    const copia = { ...asignaciones.value }
    if (!copia[tipo]) copia[tipo] = {}
    const actuales = new Set(copia[tipo][recursoId] || [])
    actuales.add(etiquetaId)
    copia[tipo][recursoId] = [...actuales]
    asignaciones.value = copia
  }

  async function desasignar(tipo, recursoId, etiquetaId) {
    await apiFetch('/api/etiquetas/desasignar', {
      method: 'POST',
      body: { etiquetaId, recursoTipo: tipo, recursoId },
    })
    const copia = { ...asignaciones.value }
    if (!copia[tipo] || !copia[tipo][recursoId]) return
    copia[tipo][recursoId] = copia[tipo][recursoId].filter(id => id !== etiquetaId)
    if (!copia[tipo][recursoId].length) delete copia[tipo][recursoId]
    asignaciones.value = copia
  }

  function conteoAsignacionesEtiqueta(etiquetaId) {
    return porId(etiquetaId)?.conteo ?? 0
  }

  const conteoPorEtiqueta = computed(() => {
    const map = {}
    for (const e of items.value) map[e.id] = e.conteo ?? 0
    return map
  })

  // Migración localStorage → backend (catálogo + asignaciones).
  async function migrarLocalStorageSiHaceFalta() {
    if (typeof localStorage === 'undefined') return
    const rawI = localStorage.getItem(STORAGE_ITEMS_LEGACY)
    if (!rawI) return
    let legacy
    try { legacy = JSON.parse(rawI) } catch { return }
    if (!Array.isArray(legacy) || legacy.length === 0) {
      localStorage.removeItem(STORAGE_ITEMS_LEGACY)
      localStorage.removeItem(STORAGE_ASIGN_LEGACY)
      return
    }
    await fetchItems(true)
    if (items.value.length > 0) {
      localStorage.removeItem(STORAGE_ITEMS_LEGACY)
      localStorage.removeItem(STORAGE_ASIGN_LEGACY)
      return
    }
    const oldIdToNewId = {}
    let okCount = 0
    for (const e of legacy) {
      try {
        const nueva = await crear({ nombre: e.nombre, color: e.color })
        if (nueva) {
          oldIdToNewId[e.id] = nueva.id
          okCount++
        }
      } catch (err) {
        console.warn('[etiquetas] migración item falló', err)
      }
    }
    // Migrar asignaciones legacy si existen.
    let rawA
    try { rawA = JSON.parse(localStorage.getItem(STORAGE_ASIGN_LEGACY) || '{}') } catch { rawA = {} }
    for (const tipo of Object.keys(rawA || {})) {
      for (const recursoId of Object.keys(rawA[tipo] || {})) {
        for (const oldEtqId of rawA[tipo][recursoId]) {
          const newId = oldIdToNewId[oldEtqId]
          if (!newId) continue
          try {
            await asignar(tipo, recursoId, newId)
          } catch (err) {
            // ignorar (puede ser que el recurso ya no exista)
          }
        }
      }
    }
    if (okCount === legacy.length) {
      localStorage.removeItem(STORAGE_ITEMS_LEGACY)
      localStorage.removeItem(STORAGE_ASIGN_LEGACY)
    }
  }

  return {
    items, asignaciones,
    fetchItems, fetchAsignaciones,
    crear, actualizar, eliminar, porId,
    etiquetasDe, asignar, desasignar,
    conteoAsignacionesEtiqueta, conteoPorEtiqueta,
    migrarLocalStorageSiHaceFalta,
  }
}
