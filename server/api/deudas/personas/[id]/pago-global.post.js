import { db } from '../../../../utils/db.js'
import { deudas, pagosDeuda } from '../../../../database/schema.js'
import { getUsuarioId } from '../../../../utils/getUsuario.js'
import { eq, and, or, asc, isNull, isNotNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const personaId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const usuarioId = await getUsuarioId()

  const montoTotal = parseFloat(body.monto)
  if (!montoTotal || montoTotal <= 0) {
    throw createError({ statusCode: 400, message: 'El monto debe ser mayor a 0' })
  }

  const fechaPago = body.fecha || new Date().toISOString().split('T')[0]
  const metodoPago = body.metodoPago?.trim() || null
  const notas = body.notas?.trim() || null
  const hoy = new Date().toISOString().split('T')[0]

  // Get all active debts for this person (pendiente or parcial)
  const deudasActivas = await db
    .select()
    .from(deudas)
    .where(and(
      eq(deudas.usuarioId, usuarioId),
      eq(deudas.personaEntidadId, personaId),
      or(eq(deudas.estado, 'pendiente'), eq(deudas.estado, 'parcial'))
    ))

  if (deudasActivas.length === 0) {
    throw createError({ statusCode: 400, message: 'No hay deudas pendientes para esta persona' })
  }

  // Sort debts by priority:
  // 1. Debts with overdue fechaPago (past due date) - sorted by fechaPago ascending
  // 2. Debts without fechaPago - sorted by fechaCreacion ascending (oldest first)
  // 3. Debts with future fechaPago - sorted by fechaPago ascending
  const sorted = [...deudasActivas].sort((a, b) => {
    const aFechaPago = a.fechaPago
    const bFechaPago = b.fechaPago

    const aVencida = aFechaPago && aFechaPago <= hoy
    const bVencida = bFechaPago && bFechaPago <= hoy
    const aSinFecha = !aFechaPago
    const bSinFecha = !bFechaPago

    // Priority 1: overdue debts first
    if (aVencida && !bVencida) return -1
    if (!aVencida && bVencida) return 1
    if (aVencida && bVencida) {
      return aFechaPago < bFechaPago ? -1 : aFechaPago > bFechaPago ? 1 : 0
    }

    // Priority 2: debts without fechaPago (sorted by fechaCreacion oldest first)
    if (aSinFecha && !bSinFecha) return -1
    if (!aSinFecha && bSinFecha) return 1
    if (aSinFecha && bSinFecha) {
      return a.fechaCreacion < b.fechaCreacion ? -1 : a.fechaCreacion > b.fechaCreacion ? 1 : 0
    }

    // Priority 3: future fechaPago (sorted ascending)
    return aFechaPago < bFechaPago ? -1 : aFechaPago > bFechaPago ? 1 : 0
  })

  // Ejecutar en transacción para garantizar consistencia
  const result = await db.transaction(async (tx) => {
    let montoRestante = montoTotal
    const pagosRealizados = []
    const deudasActualizadas = []

    for (const deuda of sorted) {
      if (montoRestante <= 0) break

      const pendiente = parseFloat(deuda.montoPendiente)
      const montoAplicar = Math.min(montoRestante, pendiente)
      const nuevoPendiente = Math.round((pendiente - montoAplicar) * 100) / 100
      const nuevoEstado = nuevoPendiente <= 0 ? 'pagado' : 'parcial'

      // Create payment record
      const [pago] = await tx
        .insert(pagosDeuda)
        .values({
          deudaId: deuda.id,
          montoPagado: String(montoAplicar),
          fechaPago,
          metodoPago,
          notas: notas ? `Pago global - ${notas}` : 'Pago global',
        })
        .returning()

      // Update debt
      const [deudaActualizada] = await tx
        .update(deudas)
        .set({
          montoPendiente: String(Math.max(0, nuevoPendiente)),
          estado: nuevoEstado,
          updatedAt: new Date(),
        })
        .where(eq(deudas.id, deuda.id))
        .returning()

      pagosRealizados.push({
        ...pago,
        montoPagado: parseFloat(pago.montoPagado),
        concepto: deuda.concepto,
      })

      deudasActualizadas.push({
        ...deudaActualizada,
        montoOriginal: parseFloat(deudaActualizada.montoOriginal),
        montoPendiente: parseFloat(deudaActualizada.montoPendiente),
      })

      montoRestante = Math.round((montoRestante - montoAplicar) * 100) / 100
    }

    return {
      montoAplicado: montoTotal - montoRestante,
      montoSobrante: montoRestante,
      pagos: pagosRealizados,
      deudas: deudasActualizadas,
    }
  })

  return result
})
