import { db } from '../../utils/db.js'
import { etiquetas, etiquetasAsign } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

// Devuelve todas las asignaciones de etiquetas del usuario, opcionalmente
// filtradas por tipo. El cliente lo indexa por (tipo, recursoId) para
// pintar chips sin queries por recurso.
//
// Forma de respuesta:
//   { gasto: { [gastoId]: [etiquetaId,...] }, planificado: {...}, futuro: {...} }
export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const q = getQuery(event)
  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')

  const conds = [eq(etiquetas.usuarioId, usuarioId)]
  if (q.tipo) conds.push(eq(etiquetasAsign.recursoTipo, q.tipo))

  const rows = await db
    .select({
      etiquetaId: etiquetasAsign.etiquetaId,
      recursoTipo: etiquetasAsign.recursoTipo,
      recursoId: etiquetasAsign.recursoId,
    })
    .from(etiquetasAsign)
    .innerJoin(etiquetas, eq(etiquetas.id, etiquetasAsign.etiquetaId))
    .where(and(...conds))

  const out = { gasto: {}, planificado: {}, futuro: {} }
  for (const r of rows) {
    if (!out[r.recursoTipo]) out[r.recursoTipo] = {}
    if (!out[r.recursoTipo][r.recursoId]) out[r.recursoTipo][r.recursoId] = []
    out[r.recursoTipo][r.recursoId].push(r.etiquetaId)
  }
  return out
})
