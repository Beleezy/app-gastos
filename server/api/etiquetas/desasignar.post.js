import { db } from '../../utils/db.js'
import { etiquetas, etiquetasAsign } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await readBody(event)
  const { etiquetaId, recursoTipo, recursoId } = body || {}

  if (!etiquetaId || !recursoTipo || !recursoId) {
    throw createError({ statusCode: 400, message: 'parámetros requeridos faltantes' })
  }

  // Verificar ownership via JOIN.
  const [etq] = await db
    .select({ id: etiquetas.id })
    .from(etiquetas)
    .where(and(eq(etiquetas.id, etiquetaId), eq(etiquetas.usuarioId, usuarioId)))
    .limit(1)
  if (!etq) throw createError({ statusCode: 404, message: 'Etiqueta no encontrada' })

  await db.delete(etiquetasAsign).where(and(
    eq(etiquetasAsign.etiquetaId, etiquetaId),
    eq(etiquetasAsign.recursoTipo, recursoTipo),
    eq(etiquetasAsign.recursoId, recursoId),
  ))

  return { ok: true }
})
