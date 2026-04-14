import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../../../utils/db.js'
import { gastosFuturos, gastosFuturosDetalles, gastosFuturosOpciones } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import {
  fetchFutureExpenseById,
  normalizeGastoFuturoPayload,
  validarCategoriaGastoFuturo,
} from '../../../utils/gastosFuturos.js'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)
  const payload = normalizeGastoFuturoPayload(body)

  const [existing] = await db
    .select({ id: gastosFuturos.id })
    .from(gastosFuturos)
    .where(and(eq(gastosFuturos.id, id), eq(gastosFuturos.usuarioId, usuarioId)))
    .limit(1)

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Gasto futuro no encontrado' })
  }

  await validarCategoriaGastoFuturo(db, payload.categoriaId, usuarioId)

  const detallesExistentes = await db
    .select()
    .from(gastosFuturosDetalles)
    .where(eq(gastosFuturosDetalles.gastoFuturoId, id))

  const decididosPorId = new Map(
    detallesExistentes
      .filter(d => d.estadoDecision)
      .map(d => [d.id, d])
  )

  await db.transaction(async (tx) => {
    await tx
      .update(gastosFuturos)
      .set({
        categoriaId: payload.categoriaId,
        tipoGasto: payload.tipoGasto,
        descripcion: payload.descripcion,
        prioridad: payload.prioridad,
        updatedAt: new Date(),
      })
      .where(eq(gastosFuturos.id, id))

    const idsNoDecididos = detallesExistentes
      .filter(d => !d.estadoDecision)
      .map(d => d.id)

    if (idsNoDecididos.length > 0) {
      await tx
        .delete(gastosFuturosDetalles)
        .where(inArray(gastosFuturosDetalles.id, idsNoDecididos))
    }

    const idsDecididosVigentes = new Set()
    let orden = 0

    for (const detalle of payload.detalles) {
      if (detalle.id && decididosPorId.has(detalle.id)) {
        idsDecididosVigentes.add(detalle.id)
        await tx
          .update(gastosFuturosDetalles)
          .set({ orden, updatedAt: new Date() })
          .where(eq(gastosFuturosDetalles.id, detalle.id))
        orden++
        continue
      }

      const [inserted] = await tx
        .insert(gastosFuturosDetalles)
        .values({
          gastoFuturoId: id,
          nombre: detalle.nombre,
          notas: detalle.notas,
          orden,
        })
        .returning({ id: gastosFuturosDetalles.id })

      for (const [optionIndex, opcion] of detalle.opciones.entries()) {
        await tx
          .insert(gastosFuturosOpciones)
          .values({
            detalleId: inserted.id,
            nombre: opcion.nombre,
            referenciaUrl: opcion.referenciaUrl,
            imagenUrl: opcion.imagenUrl,
            precioMinimo: opcion.precioMinimo !== null ? String(opcion.precioMinimo) : null,
            precioMaximo: opcion.precioMaximo !== null ? String(opcion.precioMaximo) : null,
            precioPromedio: opcion.precioPromedio !== null ? String(opcion.precioPromedio) : null,
            notas: opcion.notas,
            orden: optionIndex,
          })
      }
      orden++
    }

    const idsHuerfanos = [...decididosPorId.keys()].filter(k => !idsDecididosVigentes.has(k))
    if (idsHuerfanos.length > 0) {
      await tx
        .delete(gastosFuturosDetalles)
        .where(inArray(gastosFuturosDetalles.id, idsHuerfanos))
    }
  })

  return await fetchFutureExpenseById(db, usuarioId, id)
})
