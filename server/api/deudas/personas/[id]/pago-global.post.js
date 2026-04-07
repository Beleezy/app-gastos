import { db } from '../../../../utils/db.js'
import { deudas, pagosDeuda, personasEntidades } from '../../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { crearPagoEspejo, registrarAuditoria } from '../../../../utils/vinculos.js'
import { eq, and, or } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const personaId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  const montoTotal = parseFloat(body.monto)
  if (!montoTotal || montoTotal <= 0) {
    throw createError({ statusCode: 400, message: 'El monto debe ser mayor a 0' })
  }

  const fechaPago = body.fecha || new Date().toISOString().split('T')[0]
  const metodoPago = body.metodoPago?.trim() || null
  const notas = body.notas?.trim() || null
  const hoy = new Date().toISOString().split('T')[0]

  // Verificar persona y si está vinculada
  const [persona] = await db
    .select({ id: personasEntidades.id, vinculoParId: personasEntidades.vinculoParId, vinculadoUsuarioId: personasEntidades.vinculadoUsuarioId })
    .from(personasEntidades)
    .where(and(
      eq(personasEntidades.id, personaId),
      eq(personasEntidades.usuarioId, usuarioId)
    ))
    .limit(1)

  if (!persona) {
    throw createError({ statusCode: 404, message: 'Persona no encontrada' })
  }

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

  const sorted = [...deudasActivas].sort((a, b) => {
    const aFechaPago = a.fechaPago
    const bFechaPago = b.fechaPago
    const aVencida = aFechaPago && aFechaPago <= hoy
    const bVencida = bFechaPago && bFechaPago <= hoy
    const aSinFecha = !aFechaPago
    const bSinFecha = !bFechaPago

    if (aVencida && !bVencida) return -1
    if (!aVencida && bVencida) return 1
    if (aVencida && bVencida) return aFechaPago < bFechaPago ? -1 : aFechaPago > bFechaPago ? 1 : 0
    if (aSinFecha && !bSinFecha) return -1
    if (!aSinFecha && bSinFecha) return 1
    if (aSinFecha && bSinFecha) return a.fechaCreacion < b.fechaCreacion ? -1 : a.fechaCreacion > b.fechaCreacion ? 1 : 0
    return aFechaPago < bFechaPago ? -1 : aFechaPago > bFechaPago ? 1 : 0
  })

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

      const [deudaActualizada] = await tx
        .update(deudas)
        .set({
          montoPendiente: String(Math.max(0, nuevoPendiente)),
          estado: nuevoEstado,
          updatedAt: new Date(),
        })
        .where(eq(deudas.id, deuda.id))
        .returning()

      // Sincronizar con espejo si la deuda está vinculada
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
      }

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

    // Registrar auditoría si persona está vinculada
    if (persona.vinculoParId) {
      const montoAplicado = montoTotal - montoRestante
      await registrarAuditoria(tx, {
        personaAId: personaId,
        personaBId: persona.vinculoParId,
        usuarioId,
        accion: 'pago_creado',
        descripcion: `Pago global de S/ ${montoAplicado}${metodoPago ? ` vía ${metodoPago}` : ''} (${pagosRealizados.length} deuda${pagosRealizados.length !== 1 ? 's' : ''})`,
        datos: { montoAplicado, metodoPago, deudasPagadas: pagosRealizados.map(p => ({ deudaId: p.deudaId, concepto: p.concepto, monto: p.montoPagado })) },
      })
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
