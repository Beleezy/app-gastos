import { db } from '../../utils/db.js'
import { metasAhorro } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  if (!body.tipo || !['global', 'mensual'].includes(body.tipo)) {
    throw createError({ statusCode: 400, message: 'Tipo debe ser "global" o "mensual"' })
  }
  if (!body.montoObjetivo || body.montoObjetivo <= 0) {
    throw createError({ statusCode: 400, message: 'Monto objetivo debe ser mayor a 0' })
  }

  const isGlobal = body.tipo === 'global'

  const conditions = [eq(metasAhorro.usuarioId, usuarioId), eq(metasAhorro.tipo, body.tipo)]
  if (isGlobal) {
    conditions.push(isNull(metasAhorro.mes))
  } else {
    conditions.push(eq(metasAhorro.mes, body.mes))
    conditions.push(eq(metasAhorro.anio, body.anio))
  }

  const [existing] = await db
    .select()
    .from(metasAhorro)
    .where(and(...conditions))
    .limit(1)

  if (existing) {
    const [updated] = await db
      .update(metasAhorro)
      .set({ montoObjetivo: String(body.montoObjetivo), updatedAt: new Date() })
      .where(eq(metasAhorro.id, existing.id))
      .returning()
    return { ...updated, montoObjetivo: parseFloat(updated.montoObjetivo) }
  }

  const [created] = await db
    .insert(metasAhorro)
    .values({
      usuarioId,
      tipo: body.tipo,
      mes: isGlobal ? null : body.mes,
      anio: isGlobal ? null : body.anio,
      montoObjetivo: String(body.montoObjetivo),
    })
    .returning()

  return { ...created, montoObjetivo: parseFloat(created.montoObjetivo) }
})
