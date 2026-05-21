import { db } from '../../utils/db.js'
import { suscripcionesServicios } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, isNull } from 'drizzle-orm'

const PERIODICIDADES_VALIDAS = new Set([
  'semanal', 'quincenal', 'mensual', 'bimestral',
  'trimestral', 'semestral', 'anual',
])

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const set = { updatedAt: new Date() }
  if (body.nombre !== undefined) set.nombre = String(body.nombre).trim().slice(0, 120)
  if (body.monto !== undefined) {
    const m = Number(body.monto)
    if (!(m > 0)) throw createError({ statusCode: 400, message: 'monto inválido' })
    set.monto = String(m)
  }
  if (body.periodicidad !== undefined) {
    if (!PERIODICIDADES_VALIDAS.has(body.periodicidad)) {
      throw createError({ statusCode: 400, message: 'periodicidad inválida' })
    }
    set.periodicidad = body.periodicidad
  }
  if (body.fechaInicio !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.fechaInicio)) {
      throw createError({ statusCode: 400, message: 'fechaInicio inválida' })
    }
    set.fechaInicio = body.fechaInicio
  }
  if (body.categoriaId !== undefined) set.categoriaId = body.categoriaId
  if (body.icono !== undefined) set.icono = body.icono
  if (body.color !== undefined) set.color = body.color
  if (body.url !== undefined) set.url = body.url
  if (body.notas !== undefined) set.notas = body.notas
  if (body.activa !== undefined) set.activa = !!body.activa

  const [updated] = await db
    .update(suscripcionesServicios)
    .set(set)
    .where(and(
      eq(suscripcionesServicios.id, id),
      eq(suscripcionesServicios.usuarioId, usuarioId),
      isNull(suscripcionesServicios.deletedAt),
    ))
    .returning()

  if (!updated) throw createError({ statusCode: 404, message: 'Suscripción no encontrada' })
  return { ...updated, monto: parseFloat(updated.monto) }
})
