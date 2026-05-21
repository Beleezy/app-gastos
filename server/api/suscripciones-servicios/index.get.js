import { db } from '../../utils/db.js'
import { suscripcionesServicios } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, isNull, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')

  const rows = await db
    .select()
    .from(suscripcionesServicios)
    .where(and(
      eq(suscripcionesServicios.usuarioId, usuarioId),
      isNull(suscripcionesServicios.deletedAt),
    ))
    .orderBy(desc(suscripcionesServicios.createdAt))

  return rows.map(s => ({ ...s, monto: parseFloat(s.monto) }))
})
