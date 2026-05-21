import { db } from '../../utils/db.js'
import { metas, metaMovimientos } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, isNull, sql, desc } from 'drizzle-orm'

// Lista metas del usuario y devuelve también el progreso agregado
// (SUM de movimientos) en la misma query — N+1 evitado con leftJoin.
export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')

  const rows = await db
    .select({
      id: metas.id,
      nombre: metas.nombre,
      tipo: metas.tipo,
      montoObjetivo: metas.montoObjetivo,
      fechaLimite: metas.fechaLimite,
      icono: metas.icono,
      color: metas.color,
      archivada: metas.archivada,
      createdAt: metas.createdAt,
      progreso: sql`COALESCE(SUM(${metaMovimientos.monto}), 0)`.as('progreso'),
      countMovs: sql`COUNT(${metaMovimientos.id})`.as('count_movs'),
    })
    .from(metas)
    .leftJoin(metaMovimientos, eq(metaMovimientos.metaId, metas.id))
    .where(and(eq(metas.usuarioId, usuarioId), isNull(metas.deletedAt)))
    .groupBy(metas.id)
    .orderBy(desc(metas.createdAt))

  return rows.map(m => ({
    ...m,
    montoObjetivo: parseFloat(m.montoObjetivo),
    progreso: parseFloat(m.progreso),
    countMovs: Number(m.countMovs),
  }))
})
