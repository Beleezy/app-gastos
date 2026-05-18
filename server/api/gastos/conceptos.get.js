import { db } from '../../utils/db.js'
import { gastos } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { and, eq, sql, ilike } from 'drizzle-orm'
import { escapeLikePattern, sanitizeString } from '../../utils/sqlSafe.js'

const MAX_Q_LEN = 100

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const { q } = getQuery(event)

  // Sanitizar input antes de cualquier uso: corta a 100 chars, quita
  // NUL/zero-width, y escapa los comodines de LIKE para que `%` no
  // matchee todo. El binding de Drizzle ya parametriza el valor, así
  // que SQL injection clásico está cerrado; esto cierra el caso de
  // LIKE-as-wildcard.
  const qSanitizado = sanitizeString(q, MAX_Q_LEN)
  const conditions = [eq(gastos.usuarioId, usuarioId)]
  if (qSanitizado) {
    conditions.push(ilike(gastos.concepto, `%${escapeLikePattern(qSanitizado)}%`))
  }

  const result = await db
    .select({
      concepto: gastos.concepto,
      categoriaId: gastos.categoriaId,
      count: sql`count(*)`.as('count'),
    })
    .from(gastos)
    .where(and(...conditions))
    .groupBy(gastos.concepto, gastos.categoriaId)
    .orderBy(sql`count(*) DESC`)
    .limit(10)

  return result.map((r) => ({
    concepto: r.concepto,
    categoriaId: r.categoriaId,
    count: Number(r.count),
  }))
})
