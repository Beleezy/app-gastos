// Endpoint cron: marca como "expirada" toda solicitud_vinculo con
// estado "pendiente" cuyo created_at sea anterior a N días.
// Ver §2.8 de planifica.md.
//
// Protección: requiere header X-Cron-Secret igual a process.env.CRON_SECRET.
// Sin auth de usuario para que pueda invocarse desde GitHub Actions /
// Supabase Cron / Vercel Cron sin sesión.

import { and, eq, sql } from 'drizzle-orm'
import { db } from '../../utils/db.js'
import { solicitudesVinculo } from '../../database/schema.js'
import { logger } from '../../utils/logger.js'

const DIAS_EXPIRACION_DEFAULT = 30

export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET
  const got = getRequestHeader(event, 'x-cron-secret')
  if (!secret || !got || secret !== got) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const dias = parseInt(process.env.SOLICITUDES_EXPIRACION_DIAS, 10) || DIAS_EXPIRACION_DEFAULT

  const result = await db
    .update(solicitudesVinculo)
    .set({ estado: 'expirada', updatedAt: new Date() })
    .where(
      and(
        eq(solicitudesVinculo.estado, 'pendiente'),
        sql`${solicitudesVinculo.createdAt} < NOW() - INTERVAL '${sql.raw(String(dias))} days'`,
      ),
    )
    .returning({ id: solicitudesVinculo.id })

  logger.info('Solicitudes expiradas', { dias, count: result.length })

  return { expiradas: result.length, dias }
})
