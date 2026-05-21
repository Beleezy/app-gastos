import { db } from '../../utils/db.js'
import { metas } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, isNull } from 'drizzle-orm'

const TIPOS_VALIDOS = new Set(['ahorro', 'deuda', 'gasto_limite'])

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const set = { updatedAt: new Date() }
  if (body.nombre !== undefined) set.nombre = String(body.nombre).trim().slice(0, 120)
  if (body.tipo !== undefined) {
    if (!TIPOS_VALIDOS.has(body.tipo)) {
      throw createError({ statusCode: 400, message: 'tipo inválido' })
    }
    set.tipo = body.tipo
  }
  if (body.montoObjetivo !== undefined) {
    const v = Number(body.montoObjetivo)
    if (!(v > 0)) throw createError({ statusCode: 400, message: 'montoObjetivo inválido' })
    set.montoObjetivo = String(v)
  }
  if (body.fechaLimite !== undefined) {
    if (body.fechaLimite && !/^\d{4}-\d{2}-\d{2}$/.test(body.fechaLimite)) {
      throw createError({ statusCode: 400, message: 'fechaLimite inválida' })
    }
    set.fechaLimite = body.fechaLimite || null
  }
  if (body.icono !== undefined) set.icono = body.icono
  if (body.color !== undefined) set.color = body.color
  if (body.archivada !== undefined) set.archivada = !!body.archivada

  const [updated] = await db
    .update(metas)
    .set(set)
    .where(and(
      eq(metas.id, id),
      eq(metas.usuarioId, usuarioId),
      isNull(metas.deletedAt),
    ))
    .returning()

  if (!updated) throw createError({ statusCode: 404, message: 'Meta no encontrada' })
  return { ...updated, montoObjetivo: parseFloat(updated.montoObjetivo) }
})
