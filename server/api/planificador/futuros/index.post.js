import { db } from '../../../utils/db.js'
import { gastosFuturos } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import {
  fetchFutureExpenseById,
  normalizeGastoFuturoPayload,
  persistGastoFuturoChildren,
  validarCategoriaGastoFuturo,
} from '../../../utils/gastosFuturos.js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)
  const payload = normalizeGastoFuturoPayload(body)

  await validarCategoriaGastoFuturo(db, payload.categoriaId, usuarioId)

  const proyecto = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(gastosFuturos)
      .values({
        usuarioId,
        categoriaId: payload.categoriaId,
        tipoGasto: payload.tipoGasto,
        descripcion: payload.descripcion,
      })
      .returning({ id: gastosFuturos.id })

    await persistGastoFuturoChildren(tx, inserted.id, payload.detalles)
    return inserted
  })

  return await fetchFutureExpenseById(db, usuarioId, proyecto.id)
})
