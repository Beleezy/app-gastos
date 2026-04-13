import { and, eq } from 'drizzle-orm'
import { db } from '../../../utils/db.js'
import { gastosFuturos, gastosFuturosDetalles } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import {
  fetchFutureExpenseById,
  normalizeGastoFuturoPayload,
  persistGastoFuturoChildren,
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

  await db.transaction(async (tx) => {
    await tx
      .update(gastosFuturos)
      .set({
        categoriaId: payload.categoriaId,
        tipoGasto: payload.tipoGasto,
        descripcion: payload.descripcion,
        updatedAt: new Date(),
      })
      .where(eq(gastosFuturos.id, id))

    await tx
      .delete(gastosFuturosDetalles)
      .where(eq(gastosFuturosDetalles.gastoFuturoId, id))

    await persistGastoFuturoChildren(tx, id, payload.detalles)
  })

  return await fetchFutureExpenseById(db, usuarioId, id)
})
