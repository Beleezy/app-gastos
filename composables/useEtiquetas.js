// Submódulo Etiquetas — etiquetas personalizadas reutilizables.
//
// A diferencia de "categorías", una etiqueta puede aplicarse a varios
// recursos (gasto, ingreso, planificado) y un mismo recurso puede tener
// múltiples. Sirve para cortes transversales (#viaje, #regalo, #urgente).
//
// Persistencia:
//   - etiquetas (catálogo): `etq.items.v1`
//   - asignaciones (recurso ↔ etiqueta): `etq.asign.v1`
//
// Hasta que se integre con la BD, las asignaciones viven aquí y los
// componentes de /registro y /futuros pueden leerlas vía `etiquetasDe(id)`.

const STORAGE_ITEMS = 'etq.items.v1'
const STORAGE_ASIGN = 'etq.asign.v1'

function nuevoId() {
  return `etq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const COLORES_ETIQUETA = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#10b981', '#14b8a6', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#a855f7', '#ec4899',
]

export function useEtiquetas() {
  const items = useLocalStorage(STORAGE_ITEMS, [])
  // asignaciones: { [recursoTipo]: { [recursoId]: [etiquetaId, ...] } }
  // recursoTipo: 'gasto' | 'planificado' | 'futuro' | 'libre'
  const asignaciones = useLocalStorage(STORAGE_ASIGN, {})

  function crear({ nombre, color = '#3b82f6' }) {
    const limpio = String(nombre || '').trim().replace(/^#/, '')
    if (!limpio) return null
    if (items.value.some(e => e.nombre.toLowerCase() === limpio.toLowerCase())) return null
    const etq = {
      id: nuevoId(),
      nombre: limpio,
      color,
      createdAt: new Date().toISOString(),
    }
    items.value = [...items.value, etq]
    return etq
  }

  function actualizar(id, parche) {
    items.value = items.value.map(e => e.id === id ? { ...e, ...parche, id } : e)
  }

  function eliminar(id) {
    items.value = items.value.filter(e => e.id !== id)
    // Limpiar asignaciones
    const copia = { ...asignaciones.value }
    for (const tipo of Object.keys(copia)) {
      for (const rid of Object.keys(copia[tipo])) {
        copia[tipo][rid] = (copia[tipo][rid] || []).filter(eid => eid !== id)
        if (copia[tipo][rid].length === 0) delete copia[tipo][rid]
      }
    }
    asignaciones.value = copia
  }

  function porId(id) { return items.value.find(e => e.id === id) || null }

  function etiquetasDe(tipo, recursoId) {
    const ids = asignaciones.value?.[tipo]?.[recursoId] || []
    return ids.map(id => porId(id)).filter(Boolean)
  }

  function asignar(tipo, recursoId, etiquetaId) {
    const copia = { ...asignaciones.value }
    if (!copia[tipo]) copia[tipo] = {}
    const actuales = new Set(copia[tipo][recursoId] || [])
    actuales.add(etiquetaId)
    copia[tipo][recursoId] = [...actuales]
    asignaciones.value = copia
  }

  function desasignar(tipo, recursoId, etiquetaId) {
    const copia = { ...asignaciones.value }
    if (!copia[tipo] || !copia[tipo][recursoId]) return
    copia[tipo][recursoId] = copia[tipo][recursoId].filter(id => id !== etiquetaId)
    if (copia[tipo][recursoId].length === 0) delete copia[tipo][recursoId]
    asignaciones.value = copia
  }

  function conteoAsignacionesEtiqueta(etiquetaId) {
    let count = 0
    for (const tipo of Object.keys(asignaciones.value || {})) {
      for (const ids of Object.values(asignaciones.value[tipo] || {})) {
        if (ids.includes(etiquetaId)) count++
      }
    }
    return count
  }

  const conteoPorEtiqueta = computed(() => {
    const map = {}
    for (const e of items.value) map[e.id] = conteoAsignacionesEtiqueta(e.id)
    return map
  })

  return {
    items, asignaciones,
    crear, actualizar, eliminar, porId,
    etiquetasDe, asignar, desasignar,
    conteoAsignacionesEtiqueta, conteoPorEtiqueta,
  }
}
