/**
 * Composable de filtros avanzados sobre listas de gastos.
 * Ver §5.B punto 5 de planifica.md.
 *
 * Es puro y reactivo: recibe `gastos` (Ref|array) y `filtros` (Ref de
 * objeto) y devuelve `gastosFiltrados` + helpers para activar / limpiar
 * filtros.
 *
 * Filtros soportados:
 *   - rangoFechas: { desde: 'YYYY-MM-DD', hasta: 'YYYY-MM-DD' }
 *   - categoriaIds: string[] / number[]
 *   - metodos:    'voz' | 'foto' | 'manual' (array)
 *   - montoMin / montoMax
 *   - texto:       coincidencia en concepto/notas (case-insensitive)
 */

import { normalizar } from './utils/textNormalize.js'

export function aplicarFiltros(gastos, filtros = {}) {
  if (!Array.isArray(gastos)) return []
  const f = filtros || {}
  const desde = f.rangoFechas?.desde || null
  const hasta = f.rangoFechas?.hasta || null
  const cats = Array.isArray(f.categoriaIds) ? new Set(f.categoriaIds.map(String)) : null
  const metodos = Array.isArray(f.metodos) && f.metodos.length > 0 ? new Set(f.metodos) : null
  const montoMin = Number.isFinite(parseFloat(f.montoMin)) ? parseFloat(f.montoMin) : null
  const montoMax = Number.isFinite(parseFloat(f.montoMax)) ? parseFloat(f.montoMax) : null
  const textoNorm = f.texto ? normalizar(f.texto.trim()) : ''

  return gastos.filter((g) => {
    if (desde && g.fecha < desde) return false
    if (hasta && g.fecha > hasta) return false
    if (cats && !cats.has(String(g.categoriaId))) return false
    if (metodos && !metodos.has(g.metodoRegistro)) return false
    const monto = parseFloat(g.monto)
    if (montoMin != null && monto < montoMin) return false
    if (montoMax != null && monto > montoMax) return false
    if (textoNorm) {
      const hay = normalizar(`${g.concepto || ''} ${g.notas || ''}`)
      if (!hay.includes(textoNorm)) return false
    }
    return true
  })
}

export function useFiltrosGastos(gastosSource, filtrosSource) {
  const gastosFiltrados = computed(() => {
    const gastos = unref(gastosSource) || []
    const filtros = unref(filtrosSource) || {}
    return aplicarFiltros(gastos, filtros)
  })

  const filtrosActivos = computed(() => {
    const f = unref(filtrosSource) || {}
    let n = 0
    if (f.rangoFechas?.desde || f.rangoFechas?.hasta) n++
    if (Array.isArray(f.categoriaIds) && f.categoriaIds.length > 0) n++
    if (Array.isArray(f.metodos) && f.metodos.length > 0) n++
    if (f.montoMin || f.montoMax) n++
    if (f.texto?.trim()) n++
    return n
  })

  const totalFiltrado = computed(() => {
    return (
      Math.round(gastosFiltrados.value.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0) * 100) /
      100
    )
  })

  function limpiarFiltros() {
    if (filtrosSource && 'value' in filtrosSource) {
      filtrosSource.value = {}
    }
  }

  return {
    gastosFiltrados,
    filtrosActivos,
    totalFiltrado,
    limpiarFiltros,
  }
}
