/**
 * Cálculo común para gráficos de gastos por categoría.
 * Compartido entre `components/registro/GraficoCategoria.vue` y
 * `components/planificador/GraficoCategoria.vue`.
 *
 * Ver §4.6 de planifica.md.
 */

const COLORES_DEFAULT = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

function colorParaCategoria(cat, idx) {
  return cat?.color || COLORES_DEFAULT[idx % COLORES_DEFAULT.length]
}

/**
 * Devuelve { items, total, max } a partir de una lista de gastos
 * donde cada uno tiene `monto` y `categoriaNombre`/`categoriaColor`.
 *
 * `items` viene ordenado por monto desc y normalizado:
 *   { categoria, total, color, porcentaje, count }
 */
export function calcularGastosPorCategoria(gastos) {
  if (!Array.isArray(gastos) || gastos.length === 0) {
    return { items: [], total: 0, max: 0 }
  }
  const map = new Map()
  let total = 0
  for (const g of gastos) {
    const cat = g.categoriaNombre || 'Otros'
    const monto = parseFloat(g.monto)
    if (!Number.isFinite(monto)) continue
    if (!map.has(cat)) {
      map.set(cat, { categoria: cat, total: 0, color: g.categoriaColor || null, count: 0 })
    }
    const item = map.get(cat)
    item.total += monto
    item.count += 1
    total += monto
  }
  const items = [...map.values()]
    .map((it, idx) => ({
      ...it,
      total: Math.round(it.total * 100) / 100,
      color: colorParaCategoria(it, idx),
      porcentaje: total > 0 ? Math.round((it.total / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total)

  const max = items.length > 0 ? items[0].total : 0
  return { items, total: Math.round(total * 100) / 100, max }
}

/**
 * Empareja gastos planificados vs reales por categoría para la vista
 * comparativa del planificador.
 */
export function compararPlanReal({ planificados = [], reales = [] } = {}) {
  const plan = new Map()
  for (const g of planificados) {
    const cat = g.categoriaNombre || 'Otros'
    const monto = parseFloat(g.montoEstimado ?? g.monto)
    if (!Number.isFinite(monto)) continue
    if (!plan.has(cat)) plan.set(cat, { total: 0, color: g.categoriaColor || null, count: 0 })
    const it = plan.get(cat)
    it.total += monto
    it.count += 1
  }

  const real = new Map()
  for (const g of reales) {
    const cat = g.categoriaNombre || 'Otros'
    const monto = parseFloat(g.monto)
    if (!Number.isFinite(monto)) continue
    if (!real.has(cat)) real.set(cat, { total: 0, color: g.categoriaColor || null, count: 0 })
    const it = real.get(cat)
    it.total += monto
    it.count += 1
  }

  const todas = new Set([...plan.keys(), ...real.keys()])
  const items = [...todas].map((cat, idx) => {
    const p = plan.get(cat) || { total: 0, color: null }
    const r = real.get(cat) || { total: 0 }
    return {
      categoria: cat,
      planificado: Math.round(p.total * 100) / 100,
      real: Math.round(r.total * 100) / 100,
      delta: Math.round((r.total - p.total) * 100) / 100,
      color: colorParaCategoria(p, idx),
      sobrepasado: r.total > p.total + 0.005 && p.total > 0,
    }
  })
  items.sort((a, b) => b.planificado - a.planificado || b.real - a.real)
  return items
}

export function useGraficoCategoriaData() {
  return { calcularGastosPorCategoria, compararPlanReal }
}
