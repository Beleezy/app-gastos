import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { db } from '../../utils/db.js'
import { suscripcionesPush } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'

const bodySchema = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
  userAgent: z.string().max(500).optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await validateBody(event, bodySchema)
  const ahora = new Date()

  await db
    .insert(suscripcionesPush)
    .values({
      usuarioId,
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      userAgent: body.userAgent || null,
    })
    .onConflictDoUpdate({
      target: suscripcionesPush.endpoint,
      set: {
        usuarioId,
        p256dh: body.p256dh,
        auth: body.auth,
        userAgent: body.userAgent || null,
        updatedAt: ahora,
      },
    })

  setResponseStatus(event, 201)
  return { ok: true }
})
