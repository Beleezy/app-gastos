import { db } from '../../utils/db.js'
import { ahorros, mediosAhorro } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { assertMedioAhorroPropio } from '../../utils/ahorros.js'
import { ahorroCreateSchema } from '~/shared/schemas/categorias.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  // `ahorroCreateSchema` existía desde que se escribió el módulo y este
  // handler leía `readBody` crudo, con dos comprobaciones a mano
  // (`!body.monto || !body.fecha`) que dejaban pasar todo lo demás. Cinco
  // cuerpos distintos —monto "mucho", monto negativo, fecha "no-es-fecha",
  // medioAhorroId "abc-123", monto 1e30— llegaban al INSERT y devolvían un
  // 500 con la consulta y sus parámetros en el mensaje.
  const body = await validateBody(event, ahorroCreateSchema)

  // El schema valida la FORMA del id; esto valida de quién es.
  await assertMedioAhorroPropio({ usuarioId, medioAhorroId: body.medioAhorroId })

  // `fecha` ya viene con formato YYYY-MM-DD garantizado por el schema, así
  // que mes/anio no pueden salir NaN.
  const [anio, mes] = body.fecha.split('-').map(Number)

  const [ahorro] = await db
    .insert(ahorros)
    .values({
      usuarioId,
      medioAhorroId: body.medioAhorroId || null,
      concepto: body.concepto?.trim() || null,
      monto: String(body.monto),
      fecha: body.fecha,
      mes,
      anio,
      notas: body.notas?.trim() || null,
    })
    .returning()

  let medio = null
  if (ahorro.medioAhorroId) {
    ;[medio] = await db
      .select()
      .from(mediosAhorro)
      .where(and(eq(mediosAhorro.id, ahorro.medioAhorroId), eq(mediosAhorro.usuarioId, usuarioId)))
      .limit(1)
  }

  return {
    ...ahorro,
    monto: parseFloat(ahorro.monto),
    medioNombre: medio?.nombre || null,
    medioIcono: medio?.icono || null,
    medioColor: medio?.color || null,
  }
})
