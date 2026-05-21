import { db } from '../../utils/db.js'
import { etiquetas, etiquetasAsign } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

const TIPOS_VALIDOS = new Set(['gasto', 'planificado', 'futuro'])

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await readBody(event)
  const { etiquetaId, recursoTipo, recursoId } = body || {}

  if (!etiquetaId || !recursoTipo || !recursoId) {
    throw createError({ statusCode: 400, message: 'etiquetaId, recursoTipo y recursoId son requeridos' })
  }
  if (!TIPOS_VALIDOS.has(recursoTipo)) {
    throw createError({ statusCode: 400, message: 'recursoTipo inválido' })
  }

  // Ownership: la etiqueta debe ser del usuario.
  const [etq] = await db
    .select({ id: etiquetas.id })
    .from(etiquetas)
    .where(and(eq(etiquetas.id, etiquetaId), eq(etiquetas.usuarioId, usuarioId)))
    .limit(1)
  if (!etq) throw createError({ statusCode: 404, message: 'Etiqueta no encontrada' })

  // El unique index evita duplicados; usamos onConflictDoNothing.
  const [asign] = await db
    .insert(etiquetasAsign)
    .values({ etiquetaId, recursoTipo, recursoId })
    .onConflictDoNothing()
    .returning()

  return { ok: true, asignacion: asign || null }
})
