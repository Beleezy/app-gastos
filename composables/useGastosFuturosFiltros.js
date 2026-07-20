/**
 * Filtros y ordenamiento para gastos futuros (jerarquía de 3 niveles:
 * proyecto -> detalles -> opciones).
 * Ver §4.5 / §5.A de planifica.md.
 *
 * Extraído de la lógica inline en `ListaGastosFuturos.vue`.
 *
 * Filtros soportados:
 *   - texto (case-insensitive, sin diacríticos) sobre concepto, tipo,
 *     detalle.concepto y opcion.nombre
 *   - prioridad (alta|media|baja|sinDefinir)
 *   - estadoDecision (decididos|pendientes|todos)
 *
 * Ordenamiento: 'reciente' (createdAt desc), 'precio' (precio min asc),
 * 'prioridad' (alta > media > baja > sin), 'alfabetico' (concepto/tipo).
 */

import { normalizar } from './utils/textNormalize.js'

const PRIORIDAD_ORDER = { alta: 0, media: 1, baja: 2, sinDefinir: 3 }

function precioMin(opciones) {
  if (!Array.isArray(opciones) || opciones.length === 0) return null
  let min = Infinity
  for (const o of opciones) {
    const v = parseFloat(o.precioMin ?? o.precioPromedio)
    if (Number.isFinite(v) && v > 0 && v < min) min = v
  }
  return min === Infinity ? null : min
}

export function aplicarFiltrosFuturos(proyectos, filtros = {}, orden = 'reciente') {
  if (!Array.isArray(proyectos)) return []
  const { texto = '', prioridad = 'todas', estadoDecision = 'todos' } = filtros
  const term = texto ? normalizar(texto.trim()) : ''

  let result = proyectos.filter((p) => {
    if (prioridad !== 'todas') {
      const pri = p.prioridad || 'sinDefinir'
      if (pri !== prioridad) return false
    }
    if (estadoDecision !== 'todos') {
      const detalles = Array.isArray(p.detalles) ? p.detalles : []
      const decididos = detalles.filter((d) => d.estadoDecision === 'decidido')
      if (estadoDecision === 'decididos' && decididos.length === 0) return false
      if (
        estadoDecision === 'pendientes' &&
        decididos.length === detalles.length &&
        detalles.length > 0
      )
        return false
    }
    if (term) {
      const blob = normalizar(
        [
          p.concepto,
          p.tipo,
          ...(p.detalles || []).flatMap((d) => [
            d.concepto,
            ...(d.opciones || []).map((o) => o.nombre),
          ]),
        ]
          .filter(Boolean)
          .join(' '),
      )
      if (!blob.includes(term)) return false
    }
    return true
  })

  if (orden === 'precio') {
    result = [...result].sort((a, b) => {
      const aMin = precioMin((a.detalles || []).flatMap((d) => d.opciones || [])) ?? Infinity
      const bMin = precioMin((b.detalles || []).flatMap((d) => d.opciones || [])) ?? Infinity
      return aMin - bMin
    })
  } else if (orden === 'prioridad') {
    result = [...result].sort((a, b) => {
      const ap = PRIORIDAD_ORDER[a.prioridad || 'sinDefinir'] ?? 99
      const bp = PRIORIDAD_ORDER[b.prioridad || 'sinDefinir'] ?? 99
      return ap - bp
    })
  } else if (orden === 'alfabetico') {
    result = [...result].sort((a, b) =>
      String(a.concepto || a.tipo || '').localeCompare(String(b.concepto || b.tipo || '')),
    )
  }
  // 'reciente' es el orden por defecto que llega del backend (createdAt desc)

  return result
}

export function useGastosFuturosFiltros(source, filtros, orden) {
  const proyectosFiltrados = computed(() => {
    return aplicarFiltrosFuturos(
      unref(source) || [],
      unref(filtros) || {},
      unref(orden) || 'reciente',
    )
  })

  const totales = computed(() => {
    const lista = proyectosFiltrados.value
    const detalles = lista.reduce((s, p) => s + (p.detalles?.length || 0), 0)
    const opciones = lista.reduce(
      (s, p) => s + (p.detalles || []).reduce((d, det) => d + (det.opciones?.length || 0), 0),
      0,
    )
    return { proyectos: lista.length, detalles, opciones }
  })

  return { proyectosFiltrados, totales }
}
