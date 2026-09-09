import { db } from '../../utils/db.js'
import { gastos, gastosPlanificados } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { rateLimits } from '../../utils/rateLimit.js'
import { validateBody } from '../../utils/validate.js'
import { gastosBulkIdsSchema } from '~/shared/schemas/gastos.js'
import { eq, and, inArray, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  await rateLimits.bulkOp(event, usuarioId)

  // La cadena de `if` que había aquí hacía lo mismo que
  // `gastosBulkIdsSchema`, que ya existía en shared/schemas y no usaba
  // nadie. El schema además devuelve 413 en vez de 400 cuando lo que falla
  // es el tope de 500, que es lo correcto a nivel HTTP.
  const body = await validateBody(event, gastosBulkIdsSchema)
  const ids = body.ids.map(String)

  const eliminados = await db.transaction(async (tx) => {
    const borrados = await tx
      .update(gastos)
      .set({ deletedAt: new Date() })
      .where(
        and(inArray(gastos.id, ids), eq(gastos.usuarioId, usuarioId), isNull(gastos.deletedAt)),
      )
      .returning({
        id: gastos.id,
        gastoPlanificadoId: gastos.gastoPlanificadoId,
      })

    const planificadosIds = borrados.map((g) => g.gastoPlanificadoId).filter(Boolean)

    if (planificadosIds.length > 0) {
      await tx
        .update(gastosPlanificados)
        .set({ estado: 'pendiente', updatedAt: new Date() })
        .where(inArray(gastosPlanificados.id, planificadosIds))
    }

    return borrados
  })

  return { success: true, eliminados: eliminados.length, ids: eliminados.map((g) => g.id) }
})
