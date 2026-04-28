// Capa de servicios para pagos de deudas. Ver §2.1 / §4.7 de planifica.md.

import { eq, and } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { pagosDeuda, deudas, personasEntidades } from '../database/schema.js'
import { crearPagoEspejo, registrarAuditoria } from '../utils/vinculos.js'
import { getFechaHoraLocalUsuario } from '../utils/fechaLocal.js'

/**
 * Registra un pago contra una deuda. Actualiza monto pendiente y estado
 * (parcial / pagado). Si la deuda tiene vinculo, replica el pago en la
 * deuda espejo y registra auditoría.
 *
 * @param {object} input
 * @param {string} input.usuarioId
 * @param {string} input.deudaId
 * @param {object} input.body Body validado por Zod (pagoCreateSchema).
 */
export async function registrarPago({ usuarioId, deudaId, body }) {
  const [deuda] = await db
    .select()
    .from(deudas)
    .where(and(eq(deudas.id, deudaId), eq(deudas.usuarioId, usuarioId)))
    .limit(1)

  if (!deuda) {
    const err = new Error('Deuda no encontrada')
    err.statusCode = 404
    throw err
  }

  const montoPago = parseFloat(body.monto)
  const pendienteActual = parseFloat(deuda.montoPendiente)

  if (montoPago > pendienteActual + 0.005) {
    const err = new Error('El monto del pago excede la deuda pendiente')
    err.statusCode = 400
    throw err
  }

  const nuevoPendiente = Math.max(0, pendienteActual - montoPago)
  const nuevoEstado = nuevoPendiente <= 0.005 ? 'pagado' : 'parcial'

  const [persona] = await db
    .select({ id: personasEntidades.id, vinculoParId: personasEntidades.vinculoParId })
    .from(personasEntidades)
    .where(eq(personasEntidades.id, deuda.personaEntidadId))
    .limit(1)

  const fechaPago = body.fechaPago || body.fecha || (await getFechaHoraLocalUsuario(usuarioId)).fecha

  const resultado = await db.transaction(async (tx) => {
    const [pago] = await tx
      .insert(pagosDeuda)
      .values({
        deudaId,
        montoPagado: String(montoPago),
        fechaPago,
        metodoPago: body.metodoPago?.trim() || null,
        notas: body.notas?.trim() || null,
      })
      .returning()

    const [deudaActualizada] = await tx
      .update(deudas)
      .set({
        montoPendiente: String(nuevoPendiente),
        estado: nuevoEstado,
        updatedAt: new Date(),
      })
      .where(eq(deudas.id, deudaId))
      .returning()

    if (deuda.vinculoDeudaId) {
      await crearPagoEspejo(tx, pago, deuda.vinculoDeudaId)
      await tx
        .update(deudas)
        .set({
          montoPendiente: String(nuevoPendiente),
          estado: nuevoEstado,
          updatedAt: new Date(),
        })
        .where(eq(deudas.id, deuda.vinculoDeudaId))

      if (persona?.vinculoParId) {
        await registrarAuditoria(tx, {
          personaAId: deuda.personaEntidadId,
          personaBId: persona.vinculoParId,
          usuarioId,
          accion: 'pago_creado',
          descripcion: `Pago de S/ ${montoPago} para "${deuda.concepto}"${body.metodoPago ? ` vía ${body.metodoPago}` : ''}`,
          datos: {
            pagoId: pago.id,
            deudaId,
            monto: montoPago,
            metodoPago: body.metodoPago || null,
          },
        })
      }
    }

    return { pago, deudaActualizada }
  })

  return {
    pago: {
      ...resultado.pago,
      montoPagado: parseFloat(resultado.pago.montoPagado),
    },
    deuda: {
      ...resultado.deudaActualizada,
      montoOriginal: parseFloat(resultado.deudaActualizada.montoOriginal),
      montoPendiente: parseFloat(resultado.deudaActualizada.montoPendiente),
    },
  }
}
