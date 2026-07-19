import { db } from '../../utils/db.js'
import { presupuestosCategoria } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')

  const rows = await db
    .select()
    .from(presupuestosCategoria)
    .where(eq(presupuestosCategoria.usuarioId, usuarioId))

  return rows.map((p) => ({ ...p, montoMensual: parseFloat(p.montoMensual) }))
})
