import { eq, and, desc } from 'drizzle-orm'
import { db } from '../../utils/db.js'
import { usoLlm } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = ahora.getMonth() + 1

  const filas = await db
    .select()
    .from(usoLlm)
    .where(and(eq(usoLlm.usuarioId, usuarioId), eq(usoLlm.anio, anio), eq(usoLlm.mes, mes)))
    .orderBy(desc(usoLlm.endpoint))

  const totalRequests = filas.reduce((a, f) => a + (f.totalRequests || 0), 0)
  const totalTokens = filas.reduce((a, f) => a + (f.totalTokens || 0), 0)

  return {
    anio,
    mes,
    totalRequests,
    totalTokens,
    porEndpoint: filas.map((f) => ({
      endpoint: f.endpoint,
      requests: f.totalRequests,
      tokens: f.totalTokens,
      ultimaPeticion: f.ultimaPeticion,
    })),
  }
})
