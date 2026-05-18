import { db } from '../../utils/db.js'
import { deudas, pagosDeuda, personasEntidades } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { deudaUpdateRealSchema } from '~/shared/schemas/deudas.js'
import { registrarAuditoria } from '../../utils/vinculos.js'
import { eq, and, sum } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  // Whitelist + tipos via Zod: rechaza personaEntidadId/tipoDeuda
  // (no se permiten cambios de propietario via PUT), valida estado
  // contra el enum real de DB, y bloquea valores no finitos en monto.
  const body = await validateBody(event, deudaUpdateRealSchema)

  const [deudaActual] = await db
    .select()
    .from(deudas)
    .where(and(eq(deudas.id, id), eq(deudas.usuarioId, usuarioId)))
    .limit(1)

  if (!deudaActual) {
    throw createError({ statusCode: 404, message: 'Deuda no encontrada' })
  }

  const updateData = { updatedAt: new Date() }
  if (body.concepto !== undefined) updateData.concepto = body.concepto.trim()
  if (body.fechaCreacion !== undefined) updateData.fechaCreacion = body.fechaCreacion
  if (body.fechaPago !== undefined) updateData.fechaPago = body.fechaPago || null
  if (body.notas !== undefined) updateData.notas = body.notas?.trim() || null
  if (body.estado !== undefined) updateData.estado = body.estado

  if (body.montoOriginal !== undefined) {
    const nuevoMontoOriginal = parseFloat(body.montoOriginal)

    const [result] = await db
      .select({ total: sum(pagosDeuda.montoPagado) })
      .from(pagosDeuda)
      .where(eq(pagosDeuda.deudaId, id))

    const totalPagado = parseFloat(result?.total || 0)
    const nuevoPendiente = Math.max(0, nuevoMontoOriginal - totalPagado)

    updateData.montoOriginal = String(nuevoMontoOriginal)
    updateData.montoPendiente = String(nuevoPendiente)

    if (nuevoPendiente <= 0) {
      updateData.estado = 'pagado'
    } else if (totalPagado > 0) {
      updateData.estado = 'parcial'
    } else {
      updateData.estado = 'pendiente'
    }
  }

  const [updated] = await db
    .update(deudas)
    .set(updateData)
    .where(and(
      eq(deudas.id, id),
      eq(deudas.usuarioId, usuarioId)
    ))
    .returning()

  // Sincronizar con deuda espejo si existe vínculo
  if (deudaActual.vinculoDeudaId) {
    const espejoData = { updatedAt: new Date() }
    if (updateData.concepto !== undefined) espejoData.concepto = updateData.concepto
    if (updateData.fechaCreacion !== undefined) espejoData.fechaCreacion = updateData.fechaCreacion
    if (updateData.fechaPago !== undefined) espejoData.fechaPago = updateData.fechaPago
    if (updateData.notas !== undefined) espejoData.notas = updateData.notas
    if (updateData.estado !== undefined) espejoData.estado = updateData.estado
    if (updateData.montoOriginal !== undefined) espejoData.montoOriginal = updateData.montoOriginal
    if (updateData.montoPendiente !== undefined) espejoData.montoPendiente = updateData.montoPendiente

    await db
      .update(deudas)
      .set(espejoData)
      .where(eq(deudas.id, deudaActual.vinculoDeudaId))

    // Registrar auditoría
    const [persona] = await db
      .select({ id: personasEntidades.id, vinculoParId: personasEntidades.vinculoParId })
      .from(personasEntidades)
      .where(eq(personasEntidades.id, deudaActual.personaEntidadId))
      .limit(1)

    if (persona?.vinculoParId) {
      // Build detailed changes: old value → new value
      const cambiosDetallados = {}
      const camposLegibles = {
        concepto: 'Concepto',
        montoOriginal: 'Monto',
        fechaCreacion: 'Fecha creación',
        fechaPago: 'Fecha de pago',
        notas: 'Notas',
        estado: 'Estado',
        montoPendiente: 'Monto pendiente',
      }
      for (const campo of Object.keys(updateData)) {
        if (campo === 'updatedAt') continue
        const valorAnterior = deudaActual[campo]
        const valorNuevo = updateData[campo]
        if (String(valorAnterior) !== String(valorNuevo)) {
          cambiosDetallados[campo] = {
            label: camposLegibles[campo] || campo,
            antes: valorAnterior,
            despues: valorNuevo,
          }
        }
      }

      // Build human-readable description
      const partes = Object.values(cambiosDetallados).map(c => {
        if (c.label === 'Monto') return `${c.label}: S/ ${c.antes} → S/ ${c.despues}`
        return `${c.label}: "${c.antes || '(vacío)'}" → "${c.despues || '(vacío)'}"`
      })
      const descripcionDetallada = partes.length > 0
        ? `Deuda editada: "${updated.concepto}" — ${partes.join(', ')}`
        : `Deuda editada: "${updated.concepto}"`

      await registrarAuditoria(db, {
        personaAId: deudaActual.personaEntidadId,
        personaBId: persona.vinculoParId,
        usuarioId,
        accion: 'deuda_editada',
        descripcion: descripcionDetallada,
        datos: { deudaId: id, cambios: cambiosDetallados },
      })
    }
  }

  return {
    ...updated,
    montoOriginal: parseFloat(updated.montoOriginal),
    montoPendiente: parseFloat(updated.montoPendiente),
  }
})
