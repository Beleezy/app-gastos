// Helpers puros sobre el cálculo de saldos al pagar deudas.
// Extraídos de pagos.service.js para poder testearlos sin DB.
// Ver §6.1 de planifica.md.

const TOLERANCIA = 0.005

/**
 * Calcula el nuevo saldo y estado tras un pago.
 *
 * @param {object} input
 * @param {number} input.pendienteActual
 * @param {number} input.montoPago
 * @returns {{ nuevoPendiente: number, nuevoEstado: 'pagado'|'parcial', excede: boolean }}
 */
export function calcularSaldoTrasPago({ pendienteActual, montoPago } = {}) {
  const p = parseFloat(pendienteActual)
  const m = parseFloat(montoPago)
  if (!Number.isFinite(p) || !Number.isFinite(m)) {
    return { nuevoPendiente: 0, nuevoEstado: 'pagado', excede: false }
  }
  if (m > p + TOLERANCIA) {
    return { nuevoPendiente: p, nuevoEstado: 'parcial', excede: true }
  }
  const nuevoPendiente = Math.max(0, Math.round((p - m) * 100) / 100)
  const nuevoEstado = nuevoPendiente <= TOLERANCIA ? 'pagado' : 'parcial'
  return { nuevoPendiente, nuevoEstado, excede: false }
}

/**
 * Saldo y estado de una deuda a partir de la SUMA de sus pagos vivos.
 *
 * Es la regla que usan editar y revertir un pago: en vez de sumar o
 * restar sobre el `monto_pendiente` leído antes (que otra petición pudo
 * haber cambiado entremedias), se recalcula desde el total pagado, que se
 * suma dentro de la misma transacción con la deuda bloqueada.
 *
 * @param {object} input
 * @param {number|string} input.montoOriginal
 * @param {number|string|null} input.totalPagado suma de pagos no borrados
 * @returns {{ nuevoPendiente: number, nuevoEstado: 'pendiente'|'parcial'|'pagado' }}
 */
export function calcularSaldoDesdePagos({ montoOriginal, totalPagado } = {}) {
  const original = parseFloat(montoOriginal)
  const pagadoRaw = parseFloat(totalPagado)
  const pagado = Number.isFinite(pagadoRaw) ? pagadoRaw : 0
  if (!Number.isFinite(original)) {
    return { nuevoPendiente: 0, nuevoEstado: 'pagado' }
  }
  const nuevoPendiente = Math.max(0, Math.round((original - pagado) * 100) / 100)
  let nuevoEstado = 'pendiente'
  if (nuevoPendiente <= TOLERANCIA) nuevoEstado = 'pagado'
  else if (pagado > TOLERANCIA) nuevoEstado = 'parcial'
  return { nuevoPendiente, nuevoEstado }
}

/**
 * Distribuye un monto global entre varias deudas con estrategia FIFO
 * (más antigua primero) o LIFO. Útil en `FormPagoGlobal`.
 *
 * @param {object} input
 * @param {Array<{id, montoPendiente, fechaCreacion}>} input.deudas
 * @param {number} input.monto Monto total a distribuir.
 * @param {'fifo'|'lifo'} [input.estrategia='fifo']
 */
export function distribuirPagoGlobal({ deudas, monto, estrategia = 'fifo' } = {}) {
  if (!Array.isArray(deudas) || deudas.length === 0)
    return { asignaciones: [], sobrante: monto || 0 }
  const total = parseFloat(monto)
  if (!Number.isFinite(total) || total <= 0) return { asignaciones: [], sobrante: 0 }

  const ordenadas = [...deudas]
    .map((d) => ({
      id: d.id,
      pendiente: parseFloat(d.montoPendiente),
      fecha: d.fechaCreacion || d.fecha || '',
    }))
    .filter((d) => Number.isFinite(d.pendiente) && d.pendiente > 0)
    .sort((a, b) => {
      if (a.fecha === b.fecha) return 0
      return estrategia === 'lifo' ? (a.fecha < b.fecha ? 1 : -1) : a.fecha < b.fecha ? -1 : 1
    })

  let restante = total
  const asignaciones = []
  for (const d of ordenadas) {
    if (restante <= TOLERANCIA) break
    const aplicar = Math.min(restante, d.pendiente)
    const aplicarRedondeado = Math.round(aplicar * 100) / 100
    asignaciones.push({ deudaId: d.id, monto: aplicarRedondeado })
    restante = Math.round((restante - aplicarRedondeado) * 100) / 100
  }

  return { asignaciones, sobrante: Math.max(0, restante) }
}

/**
 * Ordena deudas por prioridad de pago al recibir un pago global:
 *   1. Vencidas (fechaPago <= hoy) por fechaPago asc.
 *   2. Sin fecha de vencimiento por fechaCreacion asc.
 *   3. Por vencer por fechaPago asc.
 *
 * Replica el orden histórico que estaba inline en pago-global.post.js
 * y lo expone para tests + reutilización.
 */
export function priorizarDeudasParaPago(deudas, hoyIso) {
  const hoy = hoyIso || ''
  return [...(deudas || [])].sort((a, b) => {
    const aFp = a.fechaPago
    const bFp = b.fechaPago
    const aVencida = aFp && aFp <= hoy
    const bVencida = bFp && bFp <= hoy
    const aSinFecha = !aFp
    const bSinFecha = !bFp

    if (aVencida && !bVencida) return -1
    if (!aVencida && bVencida) return 1
    if (aVencida && bVencida) return aFp < bFp ? -1 : aFp > bFp ? 1 : 0
    if (aSinFecha && !bSinFecha) return -1
    if (!aSinFecha && bSinFecha) return 1
    if (aSinFecha && bSinFecha) {
      return a.fechaCreacion < b.fechaCreacion ? -1 : a.fechaCreacion > b.fechaCreacion ? 1 : 0
    }
    return aFp < bFp ? -1 : aFp > bFp ? 1 : 0
  })
}
