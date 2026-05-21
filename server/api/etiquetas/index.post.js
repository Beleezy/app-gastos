import { db } from '../../utils/db.js'
import { etiquetas } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await readBody(event)

  const nombre = String(body?.nombre || '').trim().replace(/^#/, '').slice(0, 40)
  if (!nombre) throw createError({ statusCode: 400, message: 'nombre es requerido' })
  const color = body?.color || '#3b82f6'

  // Validar no-duplicado (case-insensitive) — la constraint del schema es
  // case-sensitive así que aquí hacemos check explícito.
  const [existe] = await db
    .select({ id: etiquetas.id })
    .from(etiquetas)
    .where(and(
      eq(etiquetas.usuarioId, usuarioId),
      sql`lower(${etiquetas.nombre}) = lower(${nombre})`,
    ))
    .limit(1)
  if (existe) throw createError({ statusCode: 409, message: 'Ya existe esa etiqueta' })

  const [nueva] = await db
    .insert(etiquetas)
    .values({ usuarioId, nombre, color })
    .returning()

  return { ...nueva, conteo: 0 }
})
