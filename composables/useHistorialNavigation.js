/**
 * Helpers para navegación de HistorialDiario.
 * Ver §4.5 de planifica.md.
 *
 * Funciones puras que ayudan a calcular agrupaciones por día/semana
 * a partir de un array plano de gastos.
 */

import { toIsoDate, parseIsoDate } from './useDateUtils'

/**
 * Agrupa gastos por fecha ISO. Devuelve array ordenado desc por fecha
 * con { fecha, gastos, total }.
 */
export function agruparPorDia(gastos) {
  if (!Array.isArray(gastos)) return []
  const map = new Map()
  for (const g of gastos) {
    const fecha = g.fecha
    if (!fecha) continue
    if (!map.has(fecha)) map.set(fecha, { fecha, gastos: [], total: 0 })
    const it = map.get(fecha)
    it.gastos.push(g)
    it.total += parseFloat(g.monto) || 0
  }
  return [...map.values()]
    .map((d) => ({ ...d, total: Math.round(d.total * 100) / 100 }))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
}

/**
 * Devuelve el lunes de la semana ISO (week starts on Monday).
 */
export function inicioSemana(iso) {
  const d = parseIsoDate(iso)
  if (!d) return iso
  const day = d.getDay() // 0..6, 0 = domingo
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return toIsoDate(d)
}

/**
 * Agrupa gastos por semana (lunes-domingo).
 * Devuelve { semana, desde, hasta, gastos, total } ordenado desc.
 */
export function agruparPorSemana(gastos) {
  if (!Array.isArray(gastos)) return []
  const map = new Map()
  for (const g of gastos) {
    const lunes = inicioSemana(g.fecha)
    if (!lunes) continue
    if (!map.has(lunes)) {
      const desdeIso = lunes
      const dD = parseIsoDate(lunes)
      dD.setDate(dD.getDate() + 6)
      map.set(lunes, {
        semana: lunes,
        desde: desdeIso,
        hasta: toIsoDate(dD),
        gastos: [],
        total: 0,
      })
    }
    const it = map.get(lunes)
    it.gastos.push(g)
    it.total += parseFloat(g.monto) || 0
  }
  return [...map.values()]
    .map((s) => ({ ...s, total: Math.round(s.total * 100) / 100 }))
    .sort((a, b) => (a.semana < b.semana ? 1 : a.semana > b.semana ? -1 : 0))
}

/**
 * Cantidad total de gastos y monto en un rango.
 */
export function totalEnRango(gastos, { desde, hasta } = {}) {
  if (!Array.isArray(gastos)) return { count: 0, total: 0 }
  let count = 0
  let total = 0
  for (const g of gastos) {
    if (desde && g.fecha < desde) continue
    if (hasta && g.fecha > hasta) continue
    count++
    total += parseFloat(g.monto) || 0
  }
  return { count, total: Math.round(total * 100) / 100 }
}
