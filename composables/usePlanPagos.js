/**
 * Sugiere un plan de pagos al crear una deuda con vencimiento.
 * Ver §5.C punto 2 de planifica.md.
 *
 * Genera N hitos uniformes entre la fecha de hoy y la fecha de
 * vencimiento. Devuelve fechas ISO y montos redondeados a 2 decimales,
 * ajustando el último para que la suma sea exacta.
 */

function addDias(d, n) {
  const r = new Date(d.getTime())
  r.setDate(r.getDate() + n)
  return r
}

function toIso(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function sugerirPlanPagos({
  monto,
  fechaInicio,
  fechaVencimiento,
  cuotas,
  frecuencia = 'mensual',
} = {}) {
  const total = parseFloat(monto)
  if (!Number.isFinite(total) || total <= 0) return { hitos: [] }

  const inicio = fechaInicio ? new Date(fechaInicio) : new Date()
  let n = parseInt(cuotas, 10)
  let stepDias

  if (!n || n < 1) {
    if (!fechaVencimiento) return { hitos: [] }
    const venc = new Date(fechaVencimiento)
    const diffDias = Math.max(1, Math.round((venc - inicio) / (1000 * 60 * 60 * 24)))
    if (frecuencia === 'quincenal') {
      n = Math.max(1, Math.round(diffDias / 15))
    } else if (frecuencia === 'semanal') {
      n = Math.max(1, Math.round(diffDias / 7))
    } else {
      n = Math.max(1, Math.round(diffDias / 30))
    }
    stepDias = Math.max(1, Math.floor(diffDias / n))
  } else {
    stepDias = frecuencia === 'quincenal' ? 15 : frecuencia === 'semanal' ? 7 : 30
  }

  const cuotaBase = Math.round((total / n) * 100) / 100
  const hitos = []
  let acumulado = 0
  for (let i = 1; i <= n; i++) {
    const fecha = toIso(addDias(inicio, stepDias * i))
    let monto = cuotaBase
    if (i === n) monto = Math.round((total - acumulado) * 100) / 100
    acumulado += monto
    hitos.push({ numero: i, fecha, monto })
  }

  return {
    hitos,
    cuotas: n,
    cuotaBase,
    total,
    frecuencia,
  }
}

/**
 * Versión "composable wrapper" para usar reactivamente desde un form.
 */
export function usePlanPagos() {
  return { sugerirPlanPagos }
}
