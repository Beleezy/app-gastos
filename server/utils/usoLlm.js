// Tracking de consumo del LLM por usuario y mes.
// Ver §1.9 de planifica.md.
//
// Operación idempotente: si la fila no existe la crea con count 1; si
// existe la incrementa. Usa ON CONFLICT del unique índice
// (usuario_id, anio, mes, endpoint).

import { sql } from 'drizzle-orm'
import { db } from './db.js'
import { usoLlm } from '../database/schema.js'
import { logger } from './logger.js'

/**
 * Registra una invocación al LLM.
 *
 * @param {object} input
 * @param {string} input.usuarioId
 * @param {string} input.endpoint Por ejemplo "voz/parse" o "voz/parse-image".
 * @param {number} [input.tokens=0]
 */
export async function trackUsoLlm({ usuarioId, endpoint, tokens = 0 }) {
  if (!usuarioId || !endpoint) return
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = ahora.getMonth() + 1

  try {
    await db
      .insert(usoLlm)
      .values({
        usuarioId,
        anio,
        mes,
        endpoint,
        totalRequests: 1,
        totalTokens: tokens || 0,
        ultimaPeticion: ahora,
      })
      .onConflictDoUpdate({
        target: [usoLlm.usuarioId, usoLlm.anio, usoLlm.mes, usoLlm.endpoint],
        set: {
          totalRequests: sql`${usoLlm.totalRequests} + 1`,
          totalTokens: sql`${usoLlm.totalTokens} + ${tokens || 0}`,
          ultimaPeticion: ahora,
          updatedAt: ahora,
        },
      })
  } catch (e) {
    // No queremos romper la respuesta del LLM por un fallo de tracking
    logger.warn('No se pudo registrar uso de LLM', { error: e })
  }
}
