import { db } from '../../../utils/db.js'
import { metas, metaMovimientos } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { eq, and, isNull, desc } from 'drizzle-orm'

// Devuelve movimientos de una meta. Verifica ownership con un JOIN
// implícito por usuarioId — evita un round-trip extra.
export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const metaId = getRouterParam(event, 'id')

  // assertOwner inline: comprobar que la meta es del usuario.
  const [meta] = await db
    .select({ id: metas.id })
    .from(metas)
    .where(and(eq(metas.id, metaId), eq(metas.usuarioId, usuarioId), isNull(metas.deletedAt)))
    .limit(1)
  if (!meta) throw createError({ statusCode: 404, message: 'Meta no encontrada' })

  const rows = await db
    .select()
    .from(metaMovimientos)
    .where(eq(metaMovimientos.metaId, metaId))
    .orderBy(desc(metaMovimientos.fecha), desc(metaMovimientos.createdAt))

  return rows.map(m => ({ ...m, monto: parseFloat(m.monto) }))
})
