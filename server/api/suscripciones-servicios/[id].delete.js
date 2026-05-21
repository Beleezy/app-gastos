import { db } from '../../utils/db.js'
import { suscripcionesServicios } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, isNull } from 'drizzle-orm'

// Soft-delete consistente con el resto del proyecto.
export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const id = getRouterParam(event, 'id')

  const [updated] = await db
    .update(suscripcionesServicios)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(suscripcionesServicios.id, id),
      eq(suscripcionesServicios.usuarioId, usuarioId),
      isNull(suscripcionesServicios.deletedAt),
    ))
    .returning({ id: suscripcionesServicios.id })

  if (!updated) throw createError({ statusCode: 404, message: 'Suscripción no encontrada' })
  return { ok: true, id: updated.id }
})
