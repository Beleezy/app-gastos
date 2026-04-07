import { db } from '../../utils/db.js'
import { gastos } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, sql, ilike } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const usuarioId = await getUsuarioFromEvent(event)

  const { q } = query

  // Conceptos más frecuentes del usuario, opcionalmente filtrados
  let whereConditions = [eq(gastos.usuarioId, usuarioId)]
  if (q?.trim()) {
    whereConditions.push(ilike(gastos.concepto, `%${q.trim()}%`))
  }

  const result = await db
    .select({
      concepto: gastos.concepto,
      categoriaId: gastos.categoriaId,
      count: sql`count(*)`.as('count'),
    })
    .from(gastos)
    .where(sql`${gastos.usuarioId} = ${usuarioId}${q?.trim() ? sql` AND ${gastos.concepto} ILIKE ${'%' + q.trim() + '%'}` : sql``}`)
    .groupBy(gastos.concepto, gastos.categoriaId)
    .orderBy(sql`count(*) DESC`)
    .limit(10)

  return result.map(r => ({
    concepto: r.concepto,
    categoriaId: r.categoriaId,
    count: Number(r.count),
  }))
})
