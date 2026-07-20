// Clasificación de deudas vencidas / próximas a vencer.
// Helper puro para usar tanto en services como en composables.

const TOLERANCIA = 0.005
const MS_DIA = 1000 * 60 * 60 * 24

/**
 * Clasifica una deuda según su saldo y fecha de vencimiento.
 *
 * @param {object} deuda
 * @param {string|number} deuda.montoPendiente
 * @param {string} [deuda.fechaVencimiento] ISO YYYY-MM-DD
 * @param {string} [deuda.estado]
 * @param {Date} [hoy] override para tests
 * @returns {{ vencida: boolean, diasRestantes: number|null, urgencia: 'pagada'|'vencida'|'urgente'|'pronto'|'normal' }}
 */
export function clasificarDeuda(deuda, hoy = new Date()) {
  const pendiente = parseFloat(deuda?.montoPendiente)
  if (!Number.isFinite(pendiente) || pendiente <= TOLERANCIA) {
    return { vencida: false, diasRestantes: null, urgencia: 'pagada' }
  }
  if (!deuda?.fechaVencimiento) {
    return { vencida: false, diasRestantes: null, urgencia: 'normal' }
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deuda.fechaVencimiento)
  if (!m) return { vencida: false, diasRestantes: null, urgencia: 'normal' }

  const venc = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
  const hoyD = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const diff = Math.round((venc - hoyD) / MS_DIA)

  if (diff < 0) return { vencida: true, diasRestantes: diff, urgencia: 'vencida' }
  if (diff <= 1) return { vencida: false, diasRestantes: diff, urgencia: 'urgente' }
  if (diff <= 7) return { vencida: false, diasRestantes: diff, urgencia: 'pronto' }
  return { vencida: false, diasRestantes: diff, urgencia: 'normal' }
}

/**
 * Filtra solo las deudas vencidas o próximas (urgente/pronto).
 */
export function deudasParaRecordar(deudas, hoy = new Date()) {
  if (!Array.isArray(deudas)) return []
  return deudas
    .map((d) => ({ ...d, _clasificacion: clasificarDeuda(d, hoy) }))
    .filter((d) => ['vencida', 'urgente', 'pronto'].includes(d._clasificacion.urgencia))
    .sort(
      (a, b) => (a._clasificacion.diasRestantes ?? 9999) - (b._clasificacion.diasRestantes ?? 9999),
    )
}
