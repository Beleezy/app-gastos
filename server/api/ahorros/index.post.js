import { db } from '../../utils/db.js'
import { ahorros, mediosAhorro } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  if (!body.monto || !body.fecha) {
    throw createError({ statusCode: 400, message: 'Monto y fecha son obligatorios' })
  }

  const fechaObj = new Date(body.fecha + 'T00:00:00')
  const mes = fechaObj.getMonth() + 1
  const anio = fechaObj.getFullYear()

  const [ahorro] = await db
    .insert(ahorros)
    .values({
      usuarioId,
      medioAhorroId: body.medioAhorroId || null,
      gastoPlanificadoId: body.gastoPlanificadoId || null,
      gastoId: body.gastoId || null,
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
    ;[medio] = await db.select().from(mediosAhorro).where(eq(mediosAhorro.id, ahorro.medioAhorroId)).limit(1)
  }

  return {
    ...ahorro,
    monto: parseFloat(ahorro.monto),
    medioNombre: medio?.nombre || null,
    medioIcono: medio?.icono || null,
    medioColor: medio?.color || null,
  }
})
