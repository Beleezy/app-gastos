import { db } from '../../utils/db.js'
import { etiquetas, etiquetasAsign } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, sql, desc } from 'drizzle-orm'

// Devuelve catálogo de etiquetas + conteo de asignaciones (todos los tipos).
export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  setHeader(event, 'Cache-Control', 'private, max-age=120, stale-while-revalidate=600')

  const rows = await db
    .select({
      id: etiquetas.id,
      nombre: etiquetas.nombre,
      color: etiquetas.color,
      createdAt: etiquetas.createdAt,
      conteo: sql`COUNT(${etiquetasAsign.id})`.as('conteo'),
    })
    .from(etiquetas)
    .leftJoin(etiquetasAsign, eq(etiquetasAsign.etiquetaId, etiquetas.id))
    .where(eq(etiquetas.usuarioId, usuarioId))
    .groupBy(etiquetas.id)
    .orderBy(desc(sql`COUNT(${etiquetasAsign.id})`), etiquetas.nombre)

  return rows.map(r => ({ ...r, conteo: Number(r.conteo) }))
})
