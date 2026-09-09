// Capa de servicios para pagos de deudas. Ver §2.1 / §4.7 de planifica.md.

import { eq, and, isNull } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { pagosDeuda, deudas, personasEntidades } from '../database/schema.js'
import { crearPagoEspejo, registrarAuditoria } from '../utils/vinculos.js'
import { getFechaHoraLocalUsuario } from '../utils/fechaLocal.js'
import { assertOwner } from '../utils/assertOwner.js'
import { calcularSaldoTrasPago } from '../utils/pagosMath.js'

/**
 * Registra un pago contra una deuda. Actualiza monto pendiente y estado
 * (parcial / pagado). Si la deuda tiene vinculo, replica el pago en la
 * deuda espejo y registra auditoría.
 *
 * CONCURRENCIA: la deuda se lee DENTRO de la transacción y con
 * `FOR UPDATE`. Antes se leía fuera, se calculaba el saldo en JS y se
 * escribía ese valor absoluto: dos pagos simultáneos leían el mismo
 * `monto_pendiente`, calculaban sobre él y el segundo UPDATE pisaba al
 * primero — se cobraban ambos y el saldo solo descontaba uno. No es
 * hipotético: la cola offline (useSyncQueue) reintenta mutaciones y el
 * doble tap en móvil manda dos POST casi a la vez. Con el lock, el
 * segundo pago espera el commit del primero y recalcula sobre el saldo
 * ya actualizado (o es rechazado por exceder el pendiente).
 *
 * @param {object} input
 * @param {string} input.usuarioId
 * @param {string} input.deudaId
 * @param {object} input.body Body validado por Zod (pagoCreateSchema).
 */
export async function registrarPago({ usuarioId, deudaId, body }) {
  const fechaPago =
    body.fechaPago || body.fecha || (await getFechaHoraLocalUsuario(usuarioId)).fecha

  const resultado = await db.transaction(async (tx) => {
    const [deuda] = await tx
      .select()
      .from(deudas)
      .where(and(eq(deudas.id, deudaId), eq(deudas.usuarioId, usuarioId), isNull(deudas.deletedAt)))
      .limit(1)
      .for('update')

    assertOwner(deuda, usuarioId, { recurso: 'Deuda' })

    const montoPago = parseFloat(body.monto)

    // El cálculo del saldo vive en pagosMath.calcularSaldoTrasPago, que es
    // el que cubren los tests. Antes esta función lo reimplementaba inline
    // y sin el redondeo a céntimos, así que lo verificado y lo desplegado
    // no eran la misma aritmética.
    const { nuevoPendiente, nuevoEstado, excede } = calcularSaldoTrasPago({
      pendienteActual: deuda.montoPendiente,
      montoPago,
    })

    if (excede) {
      const err = new Error('El monto del pago excede la deuda pendiente')
      err.statusCode = 400
      throw err
    }

    const [persona] = await tx
      .select({ id: personasEntidades.id, vinculoParId: personasEntidades.vinculoParId })
      .from(personasEntidades)
      .where(eq(personasEntidades.id, deuda.personaEntidadId))
      .limit(1)

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
      .where(and(eq(deudas.id, deudaId), isNull(deudas.deletedAt)))
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
        .where(and(eq(deudas.id, deuda.vinculoDeudaId), isNull(deudas.deletedAt)))

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
