import { db } from '../../../../utils/db.js'
import { pagosDeuda, deudas, personasEntidades } from '../../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { crearPagoEspejo, registrarAuditoria } from '../../../../utils/vinculos.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const deudaId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  if (!body.monto || body.monto <= 0) {
    throw createError({ statusCode: 400, message: 'El monto debe ser mayor a 0' })
  }

  const [deuda] = await db
    .select()
    .from(deudas)
    .where(and(
      eq(deudas.id, deudaId),
      eq(deudas.usuarioId, usuarioId)
    ))
    .limit(1)

  if (!deuda) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  const montoPago = parseFloat(body.monto)
  const pendienteActual = parseFloat(deuda.montoPendiente)

  if (montoPago > pendienteActual) {
    throw createError({ statusCode: 400, message: 'El monto del pago excede la deuda pendiente' })
  }

  const nuevoPendiente = pendienteActual - montoPago
  const nuevoEstado = nuevoPendiente <= 0 ? 'pagado' : 'parcial'

  // Obtener persona para auditoría
  const [persona] = await db
    .select({ id: personasEntidades.id, vinculoParId: personasEntidades.vinculoParId })
    .from(personasEntidades)
    .where(eq(personasEntidades.id, deuda.personaEntidadId))
    .limit(1)

  const resultado = await db.transaction(async (tx) => {
    const [pago] = await tx
      .insert(pagosDeuda)
      .values({
        deudaId,
        montoPagado: String(montoPago),
        fechaPago: body.fecha || new Date().toISOString().split('T')[0],
        metodoPago: body.metodoPago?.trim() || null,
        notas: body.notas?.trim() || null,
      })
      .returning()

    const [deudaActualizada] = await tx
      .update(deudas)
      .set({
        montoPendiente: String(Math.max(0, nuevoPendiente)),
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
          montoPendiente: String(Math.max(0, nuevoPendiente)),
          estado: nuevoEstado,
          updatedAt: new Date(),
        })
        .where(eq(deudas.id, deuda.vinculoDeudaId))

      // Registrar auditoría
      if (persona?.vinculoParId) {
        await registrarAuditoria(tx, {
          personaAId: deuda.personaEntidadId,
          personaBId: persona.vinculoParId,
          usuarioId,
          accion: 'pago_creado',
          descripcion: `Pago de S/ ${montoPago} para "${deuda.concepto}"${body.metodoPago ? ` vía ${body.metodoPago}` : ''}`,
          datos: { pagoId: pago.id, deudaId, monto: montoPago, metodoPago: body.metodoPago || null },
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
})
