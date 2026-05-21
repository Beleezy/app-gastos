import { db } from '../../../utils/db.js'
import { metas, metaMovimientos } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const movId = getRouterParam(event, 'movId')

  // Verificar ownership con JOIN a metas.
  const [encontrado] = await db
    .select({ id: metaMovimientos.id })
    .from(metaMovimientos)
    .innerJoin(metas, eq(metas.id, metaMovimientos.metaId))
    .where(and(
      eq(metaMovimientos.id, movId),
      eq(metas.usuarioId, usuarioId),
      isNull(metas.deletedAt),
    ))
    .limit(1)
  if (!encontrado) throw createError({ statusCode: 404, message: 'Movimiento no encontrado' })

  await db.delete(metaMovimientos).where(eq(metaMovimientos.id, movId))
  return { ok: true, id: movId }
})
