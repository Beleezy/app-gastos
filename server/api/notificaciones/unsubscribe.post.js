import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../../utils/db.js'
import { suscripcionesPush } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'

const bodySchema = z.object({
  endpoint: z.string().url().max(2000),
})

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, bodySchema)

  const r = await db
    .delete(suscripcionesPush)
    .where(
      and(
        eq(suscripcionesPush.usuarioId, usuarioId),
        eq(suscripcionesPush.endpoint, body.endpoint),
      ),
    )
    .returning({ id: suscripcionesPush.id })

  return { ok: true, eliminadas: r.length }
})
