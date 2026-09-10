import { db } from '../../utils/db.js'
import { planesMensuales } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { presupuestoPlanUpdateSchema } from '~/shared/schemas/planificador.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  // Sin validación, los NUEVE cuerpos del fuzz —`{}` incluido— acababan en
  // un 500 con la consulta y sus parámetros en el mensaje: `body.id` iba
  // derecho a un `eq()` contra una columna uuid, y `String(undefined)`
  // producía la cadena "undefined" para una columna NUMERIC.
  const body = await validateBody(event, presupuestoPlanUpdateSchema)

  const [updated] = await db
    .update(planesMensuales)
    .set({
      montoPresupuesto: String(body.montoPresupuesto),
      updatedAt: new Date(),
    })
    .where(and(eq(planesMensuales.id, body.id), eq(planesMensuales.usuarioId, usuarioId)))
    .returning()

  // El `.where()` filtra por dueño, así que un plan ajeno no devuelve filas.
  // Antes se leía `updated.montoPresupuesto` sin comprobar: un id de otra
  // cuenta daba un TypeError, es decir un 500 donde toca un 404.
  if (!updated) {
    throw createError({ statusCode: 404, message: 'Plan no encontrado' })
  }

  return { ...updated, montoPresupuesto: parseFloat(updated.montoPresupuesto) }
})
