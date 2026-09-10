import { db } from '../../utils/db.js'
import { metasAhorro } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { metaAhorroSchema } from '~/shared/schemas/categorias.js'
import { eq, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  // El handler validaba a mano `tipo` y `montoObjetivo` pero NO `mes` ni
  // `anio`, que en una meta mensual van derechos a un `eq()` contra
  // columnas integer: `{tipo:'mensual', mes:'abc'}` reventaba la query. Y
  // una meta mensual sin mes/anio se guardaba con NULL, invisible para la
  // lectura que la busca por (mes, anio).
  const body = await validateBody(event, metaAhorroSchema)

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
