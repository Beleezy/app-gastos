/**
 * Helpers puros para comparar dos meses de gastos.
 * Ver §4.5 / §3.6 de planifica.md.
 *
 * Diseñado para ser **puro** y testable: recibe arrays y devuelve
 * resultados; sin estado interno, sin acceso a Nuxt. El componente
 * StatsComparativas se quedará delgado consumiendo estas funciones.
 */

export function totalGastos(gastos) {
  if (!Array.isArray(gastos)) return 0
  return Math.round(gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0) * 100) / 100
}

export function porcentajeCambio(actual, anterior) {
  if (!anterior || anterior === 0) return null
  return ((actual - anterior) / anterior) * 100
}

export function agruparPorCategoria(gastos) {
  const map = {}
  if (!Array.isArray(gastos)) return map
  for (const g of gastos) {
    const key = g.categoriaNombre || 'Otros'
    if (!map[key]) {
      map[key] = { categoria: key, total: 0, count: 0, color: g.categoriaColor || null }
    }
    map[key].total += parseFloat(g.monto) || 0
    map[key].count += 1
  }
  for (const k of Object.keys(map)) {
    map[k].total = Math.round(map[k].total * 100) / 100
  }
  return map
}

export function topCategorias(gastos, limit = 5) {
  return Object.values(agruparPorCategoria(gastos))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

export function diferenciaPorCategoria(actuales, anteriores) {
  const a = agruparPorCategoria(actuales)
  const b = agruparPorCategoria(anteriores)
  const todas = new Set([...Object.keys(a), ...Object.keys(b)])
  const out = []
  for (const cat of todas) {
    const tActual = a[cat]?.total || 0
    const tAnterior = b[cat]?.total || 0
    out.push({
      categoria: cat,
      actual: tActual,
      anterior: tAnterior,
      delta: Math.round((tActual - tAnterior) * 100) / 100,
      porcentaje: porcentajeCambio(tActual, tAnterior),
    })
  }
  return out.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
}

export function promedioDiario(gastos) {
  if (!Array.isArray(gastos) || gastos.length === 0) return 0
  const fechas = new Set(gastos.map((g) => g.fecha).filter(Boolean))
  if (fechas.size === 0) return 0
  return Math.round((totalGastos(gastos) / fechas.size) * 100) / 100
}

/**
 * Genera insights legibles para mostrar en la UI.
 * Devuelve array de { tipo: 'up'|'down'|'neutral'|'highlight', texto }.
 */
export function generarInsights({ actuales = [], anteriores = [], etiquetaAnterior = 'el mes anterior' } = {}) {
  const out = []
  const tA = totalGastos(actuales)
  const tB = totalGastos(anteriores)
  const pct = porcentajeCambio(tA, tB)

  if (tA === 0 && tB === 0) return out

  if (pct == null) {
    out.push({ tipo: 'neutral', texto: `Aún no tienes datos para comparar con ${etiquetaAnterior}.` })
  } else if (pct > 5) {
    out.push({
      tipo: 'up',
      texto: `Gastas ${pct.toFixed(1)}% más que ${etiquetaAnterior}.`,
    })
  } else if (pct < -5) {
    out.push({
      tipo: 'down',
      texto: `Gastas ${Math.abs(pct).toFixed(1)}% menos que ${etiquetaAnterior}.`,
    })
  } else {
    out.push({ tipo: 'neutral', texto: `Tu gasto es similar a ${etiquetaAnterior}.` })
  }

  const diffCats = diferenciaPorCategoria(actuales, anteriores)
  const subida = diffCats.find((d) => d.porcentaje != null && d.porcentaje > 30 && d.actual > 0)
  if (subida) {
    out.push({
      tipo: 'highlight',
      texto: `${subida.categoria} subió ${subida.porcentaje.toFixed(0)}% respecto a ${etiquetaAnterior}.`,
    })
  }
  const bajada = diffCats.find((d) => d.porcentaje != null && d.porcentaje < -30 && d.anterior > 0)
  if (bajada) {
    out.push({
      tipo: 'highlight',
      texto: `${bajada.categoria} bajó ${Math.abs(bajada.porcentaje).toFixed(0)}% respecto a ${etiquetaAnterior}.`,
    })
  }

  return out
}

export function useStatsComparativas() {
  return {
    totalGastos,
    porcentajeCambio,
    agruparPorCategoria,
    topCategorias,
    diferenciaPorCategoria,
    promedioDiario,
    generarInsights,
  }
}
