import { db } from '../../../utils/db.js'
import { metas, metaMovimientos } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const metaId = getRouterParam(event, 'id')
  const body = await readBody(event)

  const monto = Number(body?.monto)
  if (!Number.isFinite(monto) || monto === 0) {
    throw createError({ statusCode: 400, message: 'monto inválido' })
  }
  const fecha = body?.fecha || new Date().toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw createError({ statusCode: 400, message: 'fecha inválida' })
  }

  const [meta] = await db
    .select({ id: metas.id })
    .from(metas)
    .where(and(eq(metas.id, metaId), eq(metas.usuarioId, usuarioId), isNull(metas.deletedAt)))
    .limit(1)
  if (!meta) throw createError({ statusCode: 404, message: 'Meta no encontrada' })

  const [mov] = await db
    .insert(metaMovimientos)
    .values({
      metaId,
      monto: String(monto),
      fecha,
      nota: body?.nota || null,
      origenTipo: body?.origenTipo || 'manual',
      origenId: body?.origenId || null,
    })
    .returning()

  return { ...mov, monto: parseFloat(mov.monto) }
})
