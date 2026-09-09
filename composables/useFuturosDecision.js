// Lógica de decisión y ordenación del módulo Gastos Futuros.
//
// Vivía inline en `components/futuros/Lista.vue`, que con ~2000 líneas es
// el archivo más grande del proyecto y el único módulo sin tests E2E: todo
// lo que decide qué ve el usuario estaba dentro del componente y no lo
// cubría nada. Al ser funciones puras, sacarlas aquí las hace verificables
// sin montar el componente.
//
// El filtrado y la búsqueda ya viven en `useGastosFuturosFiltros.js`; esto
// es lo que faltaba por extraer.

/**
 * Cuántos detalles de un proyecto tienen ya una decisión tomada.
 *
 * @param {{detalles?: Array<{estadoDecision?: string|null}>}} proyecto
 * @returns {{total: number, decididos: number, porcentaje: number}}
 */
export function progresoProyecto(proyecto) {
  const detalles = proyecto?.detalles || []
  const total = detalles.length
  if (total === 0) return { total: 0, decididos: 0, porcentaje: 0 }
  const decididos = detalles.filter((d) => d.estadoDecision).length
  return { total, decididos, porcentaje: Math.round((decididos / total) * 100) }
}

/** ¿Hay al menos un detalle con decisión tomada? */
export function proyectoTieneDecididos(proyecto) {
  return Boolean(proyecto?.detalles?.some((d) => d.estadoDecision))
}

/**
 * ¿Está todo decidido?
 *
 * El `length > 0` no es decorativo: `every` sobre un array vacío devuelve
 * true, así que sin él un proyecto sin detalles saldría como terminado.
 */
export function proyectoCompletamenteDecidido(proyecto) {
  const detalles = proyecto?.detalles || []
  return detalles.length > 0 && detalles.every((d) => d.estadoDecision)
}

/**
 * Ordena los detalles de un proyecto: prioridad desc, luego el orden
 * manual asc, y a igualdad el más antiguo primero. No muta la entrada.
 */
export function detallesOrdenados(detalles) {
  return [...(detalles || [])].sort((a, b) => {
    const dp = (b.prioridad ?? 0) - (a.prioridad ?? 0)
    if (dp !== 0) return dp
    const dorden = (a.orden ?? 0) - (b.orden ?? 0)
    if (dorden !== 0) return dorden
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  })
}

const BADGES = {
  comprada: { label: 'Elegida · Comprada', clases: 'bg-emerald-500/15 text-emerald-400' },
  planificada: { label: 'Elegida · Planificada', clases: 'bg-sky-500/15 text-sky-300' },
}

/**
 * Etiqueta del estado de decisión, o null si aún no se decidió.
 * Un estado que no esté en la tabla tampoco produce badge: es preferible
 * no pintar nada a inventar una etiqueta para un valor que el código no
 * conoce.
 */
export function decisionBadge(detalle) {
  return BADGES[detalle?.estadoDecision] || null
}
