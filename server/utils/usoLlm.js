// Tracking de consumo del LLM por usuario y mes.
// Ver §1.9 de planifica.md.
//
// Operación idempotente: si la fila no existe la crea con count 1; si
// existe la incrementa. Usa ON CONFLICT del unique índice
// (usuario_id, anio, mes, endpoint).

import { and, eq, sql } from 'drizzle-orm'
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

const DEFAULT_QUOTA_MENSUAL = 500

function quotaMensual() {
  const raw = Number(process.env.LLM_QUOTA_MENSUAL_USUARIO)
  if (Number.isFinite(raw) && raw > 0) return raw
  return DEFAULT_QUOTA_MENSUAL
}

/**
 * Cuenta las peticiones acumuladas del mes en curso para un usuario.
 * Suma todos los endpoints LLM.
 */
export async function getUsoMensual(usuarioId) {
  if (!usuarioId) return 0
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = ahora.getMonth() + 1
  try {
    const [row] = await db
      .select({ total: sql`COALESCE(SUM(${usoLlm.totalRequests}), 0)`.as('total') })
      .from(usoLlm)
      .where(
        and(
          eq(usoLlm.usuarioId, usuarioId),
          eq(usoLlm.anio, anio),
          eq(usoLlm.mes, mes),
        ),
      )
    return Number(row?.total || 0)
  } catch (e) {
    logger.warn('No se pudo leer uso mensual de LLM', { error: e })
    return 0
  }
}

/**
 * Guard de cuota mensual. Lanza 429 si el usuario superó el cupo del mes.
 * Configurable por LLM_QUOTA_MENSUAL_USUARIO (default 500 requests/mes).
 */
export async function assertCuotaMensual(usuarioId) {
  const limite = quotaMensual()
  if (limite === Infinity) return
  const usadas = await getUsoMensual(usuarioId)
  if (usadas >= limite) {
    logger.warn('Cuota LLM mensual superada', { usuarioId, usadas, limite })
    throw createError({
      statusCode: 429,
      statusMessage: 'LLM quota exceeded',
      message: 'Has superado el cupo mensual de procesamiento por voz/foto. Intenta de nuevo el próximo mes o registra el gasto manualmente.',
    })
  }
}
