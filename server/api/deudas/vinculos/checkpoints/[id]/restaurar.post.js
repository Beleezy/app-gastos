import { db } from '../../../../../utils/db.js'
import { vinculosCheckpoints, personasEntidades, deudas, pagosDeuda } from '../../../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../../../utils/getUsuario.js'
import { normalizarParPersonas, crearCheckpoint, registrarAuditoria, getNombreDisplay } from '../../../../../utils/vinculos.js'
import { eq, and, or, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const checkpointId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)

  // Obtener el checkpoint
  const [checkpoint] = await db
    .select()
    .from(vinculosCheckpoints)
    .where(eq(vinculosCheckpoints.id, checkpointId))
    .limit(1)

  if (!checkpoint) {
    throw createError({ statusCode: 404, message: 'Punto de guardado no encontrado' })
  }

  if (checkpoint.tipo === 'actual') {
    throw createError({ statusCode: 400, message: 'No se puede restaurar al punto de guardado actual (ya es el estado vigente)' })
  }

  // Verificar que el usuario tiene acceso a este checkpoint (su persona es A o B)
  const [miPersona] = await db
    .select()
    .from(personasEntidades)
    .where(and(
      or(
        eq(personasEntidades.id, checkpoint.personaAId),
        eq(personasEntidades.id, checkpoint.personaBId)
      ),
      eq(personasEntidades.usuarioId, usuarioId)
    ))
    .limit(1)

  if (!miPersona) {
    throw createError({ statusCode: 403, message: 'No tienes acceso a este punto de guardado' })
  }

  const personaAId = checkpoint.personaAId
  const personaBId = checkpoint.personaBId

  // Capturar datos del snapshot ANTES de cualquier modificación
  let snapshotData
  try {
    snapshotData = JSON.parse(checkpoint.snapshotDatos)
  } catch {
    throw createError({ statusCode: 500, message: 'Datos del punto de guardado corruptos' })
  }

  const nombreRestaurador = await getNombreDisplay(usuarioId)

  await db.transaction(async (tx) => {
    // 1. Guardar estado actual como nuevo checkpoint 'actual' (pre-restauración)
    //    Esto también rota: actual → anterior, anterior previo → eliminado
    await crearCheckpoint(tx, {
      personaAId,
      personaBId,
      tipo: 'actual',
      creadoPorId: usuarioId,
      descripcion: `Backup automático antes de restaurar a ${checkpoint.tipo === 'inicio_vinculo' ? 'inicio de vínculo' : 'punto anterior'}`,
    })

    // 2. Eliminar todas las deudas actuales de ambas personas
    //    (los pagos se eliminan en cascada)
    const personasAfectadas = [personaAId, personaBId].filter(Boolean)
    for (const pid of personasAfectadas) {
      await tx.delete(deudas).where(eq(deudas.personaEntidadId, pid))
    }

    // 3. Restaurar deudas del snapshot
    //    Mapa: ID original → nuevo ID (para re-linking)
    const mapaDeudas = {} // { oldId: newId }
    const mapaPagos = {} // { oldId: newId }

    // Insertar deudas sin vinculoDeudaId todavía
    for (const lado of ['personaA', 'personaB']) {
      const datoPersona = snapshotData[lado]
      if (!datoPersona) continue

      const personaId = lado === 'personaA' ? personaAId : personaBId
      if (!personaId) continue

      // Verificar que la persona aún existe
      const [personaExiste] = await tx
        .select({ id: personasEntidades.id, usuarioId: personasEntidades.usuarioId })
        .from(personasEntidades)
        .where(eq(personasEntidades.id, personaId))
        .limit(1)

      if (!personaExiste) continue

      for (const deuda of (datoPersona.deudas || [])) {
        const [nuevaDeuda] = await tx
          .insert(deudas)
          .values({
            usuarioId: personaExiste.usuarioId,
            personaEntidadId: personaId,
            tipoDeuda: deuda.tipoDeuda,
            concepto: deuda.concepto,
            montoOriginal: deuda.montoOriginal,
            montoPendiente: deuda.montoPendiente,
            fechaCreacion: deuda.fechaCreacion,
            fechaPago: deuda.fechaPago || null,
            estado: deuda.estado,
            notas: deuda.notas || null,
            // vinculoDeudaId se actualiza después
          })
          .returning()

        mapaDeudas[deuda.id] = nuevaDeuda.id

        // Insertar pagos de esta deuda (sin vinculoPagoId por ahora)
        for (const pago of (deuda.pagos || [])) {
          const [nuevoPago] = await tx
            .insert(pagosDeuda)
            .values({
              deudaId: nuevaDeuda.id,
              montoPagado: pago.montoPagado,
              fechaPago: pago.fechaPago,
              metodoPago: pago.metodoPago || null,
              notas: pago.notas || null,
              // vinculoPagoId se actualiza después
            })
            .returning()

          mapaPagos[pago.id] = nuevoPago.id
        }
      }
    }

    // 4. Re-linking de deudas (vinculoDeudaId)
    for (const lado of ['personaA', 'personaB']) {
      const datoPersona = snapshotData[lado]
      if (!datoPersona) continue

      for (const deuda of (datoPersona.deudas || [])) {
        if (!deuda.vinculoDeudaId) continue

        const newDeudaId = mapaDeudas[deuda.id]
        const newParDeudaId = mapaDeudas[deuda.vinculoDeudaId]

        if (newDeudaId && newParDeudaId) {
          await tx
            .update(deudas)
            .set({ vinculoDeudaId: newParDeudaId })
            .where(eq(deudas.id, newDeudaId))
        }
      }
    }

    // 5. Re-linking de pagos (vinculoPagoId)
    for (const lado of ['personaA', 'personaB']) {
      const datoPersona = snapshotData[lado]
      if (!datoPersona) continue

      for (const deuda of (datoPersona.deudas || [])) {
        for (const pago of (deuda.pagos || [])) {
          if (!pago.vinculoPagoId) continue

          const newPagoId = mapaPagos[pago.id]
          const newParPagoId = mapaPagos[pago.vinculoPagoId]

          if (newPagoId && newParPagoId) {
            await tx
              .update(pagosDeuda)
              .set({ vinculoPagoId: newParPagoId })
              .where(eq(pagosDeuda.id, newPagoId))
          }
        }
      }
    }

    // 6. Registrar auditoría
    const tipoLabel = checkpoint.tipo === 'inicio_vinculo'
      ? 'inicio de vínculo'
      : 'punto de guardado anterior'

    await registrarAuditoria(tx, {
      personaAId: miPersona.id,
      personaBId: miPersona.id === personaAId ? personaBId : personaAId,
      usuarioId,
      accion: 'checkpoint_restaurado',
      descripcion: `${nombreRestaurador} restauró al ${tipoLabel} (${new Date(checkpoint.createdAt).toLocaleString('es-PE')})`,
      datos: {
        checkpointId: checkpoint.id,
        tipoRestaurado: checkpoint.tipo,
        deudasRestauradas: Object.keys(mapaDeudas).length,
        pagosRestaurados: Object.keys(mapaPagos).length,
      },
    })
  })

  return {
    mensaje: `Datos restaurados al ${checkpoint.tipo === 'inicio_vinculo' ? 'inicio del vínculo' : 'punto de guardado anterior'}`,
    tipoRestaurado: checkpoint.tipo,
    fechaRestaurada: checkpoint.createdAt,
  }
})
