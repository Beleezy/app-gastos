// Cron: borra físicamente filas con deleted_at < now() - 30 días en las
// tablas con soft delete. Idem que purgar-llm-cache para auth.

import { db } from '../../utils/db.js'
import { gastos, deudas, pagosDeuda, personasEntidades } from '../../database/schema.js'
import { sql } from 'drizzle-orm'
import { logger } from '../../utils/logger.js'

const RETENCION_DIAS = 30

export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET
  const got = getRequestHeader(event, 'x-cron-secret')
  if (!secret || !got || secret !== got) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const limite = sql`NOW() - INTERVAL '${sql.raw(String(RETENCION_DIAS))} days'`

  const [gastosPurg, deudasPurg, pagosPurg, personasPurg] = await Promise.all([
    db
      .delete(gastos)
      .where(sql`${gastos.deletedAt} IS NOT NULL AND ${gastos.deletedAt} < ${limite}`)
      .returning({ id: gastos.id }),
    db
      .delete(deudas)
      .where(sql`${deudas.deletedAt} IS NOT NULL AND ${deudas.deletedAt} < ${limite}`)
      .returning({ id: deudas.id }),
    db
      .delete(pagosDeuda)
      .where(sql`${pagosDeuda.deletedAt} IS NOT NULL AND ${pagosDeuda.deletedAt} < ${limite}`)
      .returning({ id: pagosDeuda.id }),
    db
      .delete(personasEntidades)
      .where(
        sql`${personasEntidades.deletedAt} IS NOT NULL AND ${personasEntidades.deletedAt} < ${limite}`,
      )
      .returning({ id: personasEntidades.id }),
  ])

  const result = {
    gastos: gastosPurg.length,
    deudas: deudasPurg.length,
    pagosDeuda: pagosPurg.length,
    personas: personasPurg.length,
  }
  logger.info('papelera purgada', result)
  return result
})
