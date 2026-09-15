import { db } from '../../utils/db.js'
import { deudas, pagosDeuda, personasEntidades } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { deudaUpdateRealSchema } from '~/shared/schemas/deudas.js'
import { registrarAuditoria } from '../../utils/vinculos.js'
import { calcularSaldoDesdePagos } from '../../utils/pagosMath.js'
import { eq, and, sum, isNull } from 'drizzle-orm'
import { getUuidParam } from '../../utils/params.js'

export default defineEventHandler(async (event) => {
  const id = getUuidParam(event, 'id', { recurso: 'Deuda' })
  const usuarioId = await getUsuarioFromEvent(event)
  // Whitelist + tipos via Zod: rechaza personaEntidadId/tipoDeuda
  // (no se permiten cambios de propietario via PUT), valida estado
  // contra el enum real de DB, y bloquea valores no finitos en monto.
  const body = await validateBody(event, deudaUpdateRealSchema)

  // Todo dentro de una transacción con la deuda bloqueada: al cambiar el
  // monto original, el pendiente se recalcula desde la suma de pagos vivos,
  // y esa suma no puede cambiar entre la lectura y el UPDATE (un pago que
  // entre en paralelo espera al commit). Antes se leía fuera y se escribía
  // el valor absoluto — el mismo lost update que cerró el PR #100.
  const updated = await db.transaction(async (tx) => {
    const [deudaActual] = await tx
      .select()
      .from(deudas)
      .where(and(eq(deudas.id, id), eq(deudas.usuarioId, usuarioId), isNull(deudas.deletedAt)))
      .limit(1)
      .for('update')

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
      const [result] = await tx
        .select({ total: sum(pagosDeuda.montoPagado) })
        .from(pagosDeuda)
        .where(and(eq(pagosDeuda.deudaId, id), isNull(pagosDeuda.deletedAt)))

      const { nuevoPendiente, nuevoEstado } = calcularSaldoDesdePagos({
        montoOriginal: body.montoOriginal,
        totalPagado: result?.total,
      })
      updateData.montoOriginal = String(body.montoOriginal)
      updateData.montoPendiente = String(nuevoPendiente)
      updateData.estado = nuevoEstado
    }

    const [updated] = await tx
      .update(deudas)
      .set(updateData)
      .where(and(eq(deudas.id, id), eq(deudas.usuarioId, usuarioId), isNull(deudas.deletedAt)))
      .returning()

    // Sincronizar con deuda espejo si existe vínculo
    if (deudaActual.vinculoDeudaId) {
      const espejoData = { updatedAt: new Date() }
      for (const campo of [
        'concepto',
        'fechaCreacion',
        'fechaPago',
        'notas',
        'estado',
        'montoOriginal',
        'montoPendiente',
      ]) {
        if (updateData[campo] !== undefined) espejoData[campo] = updateData[campo]
      }

      await tx
        .update(deudas)
        .set(espejoData)
        .where(and(eq(deudas.id, deudaActual.vinculoDeudaId), isNull(deudas.deletedAt)))

      const [persona] = await tx
        .select({ id: personasEntidades.id, vinculoParId: personasEntidades.vinculoParId })
        .from(personasEntidades)
        .where(eq(personasEntidades.id, deudaActual.personaEntidadId))
        .limit(1)

      if (persona?.vinculoParId) {
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

        const partes = Object.values(cambiosDetallados).map((c) => {
          if (c.label === 'Monto') return `${c.label}: S/ ${c.antes} → S/ ${c.despues}`
          return `${c.label}: "${c.antes || '(vacío)'}" → "${c.despues || '(vacío)'}"`
        })
        const descripcionDetallada =
          partes.length > 0
            ? `Deuda editada: "${updated.concepto}" — ${partes.join(', ')}`
            : `Deuda editada: "${updated.concepto}"`

        await registrarAuditoria(tx, {
          personaAId: deudaActual.personaEntidadId,
          personaBId: persona.vinculoParId,
          usuarioId,
          accion: 'deuda_editada',
          descripcion: descripcionDetallada,
          datos: { deudaId: id, cambios: cambiosDetallados },
        })
      }
    }

    return updated
  })

  return {
    ...updated,
    montoOriginal: parseFloat(updated.montoOriginal),
    montoPendiente: parseFloat(updated.montoPendiente),
  }
})
