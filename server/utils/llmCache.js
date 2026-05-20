// Caché de respuestas del LLM por hash determinístico del input.
//
// Evita re-llamar a Gemini cuando un usuario repite la misma
// transcripción/foto. La clave incluye usuarioId para aislar contexto
// (categorías y personas del usuario afectan el resultado).
//
// El TTL por defecto es 6h y se puede sobreescribir por env
// (LLM_CACHE_TTL_SECONDS). En modo deudas/gastos las categorías del
// usuario pueden cambiar — el TTL corto limita el desfase.

import crypto from 'node:crypto'
import { and, eq, lt, sql } from 'drizzle-orm'
import { db } from './db.js'
import { llmCache } from '../database/schema.js'
import { logger } from './logger.js'

const DEFAULT_TTL_SECONDS = 6 * 60 * 60

function ttlSeconds() {
  const raw = Number(process.env.LLM_CACHE_TTL_SECONDS)
  if (Number.isFinite(raw) && raw > 0) return raw
  return DEFAULT_TTL_SECONDS
}

/**
 * Normaliza el input antes de hashear para que variaciones triviales
 * (mayúsculas, espacios duplicados, signos sobrantes) reusen la caché.
 */
function normalize(input) {
  if (input == null) return ''
  return String(input)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function hashInput({ texto = '', extra = '' } = {}) {
  const h = crypto.createHash('sha256')
  h.update(normalize(texto))
  h.update('')
  h.update(normalize(extra))
  return h.digest('hex')
}

/**
 * Lee la caché. Devuelve el JSON parseado o null si no hay hit / expiró.
 */
export async function getCached({ usuarioId, endpoint, modelo, inputHash }) {
  if (!usuarioId || !endpoint || !modelo || !inputHash) return null
  try {
    const [row] = await db
      .select()
      .from(llmCache)
      .where(
        and(
          eq(llmCache.usuarioId, usuarioId),
          eq(llmCache.endpoint, endpoint),
          eq(llmCache.modelo, modelo),
          eq(llmCache.inputHash, inputHash),
        ),
      )
      .limit(1)
    if (!row) return null
    if (new Date(row.expiresAt).getTime() < Date.now()) return null
    // Best-effort incremento de hits (no bloquea la lectura)
    db
      .update(llmCache)
      .set({ hits: sql`${llmCache.hits} + 1` })
      .where(eq(llmCache.id, row.id))
      .catch(() => {})
    try {
      return JSON.parse(row.responseJson)
    } catch {
      return null
    }
  } catch (e) {
    logger.warn('llmCache.getCached fallo', { error: e?.message })
    return null
  }
}

/**
 * Guarda una respuesta en caché. Idempotente: si ya hay una entrada
 * para la misma clave, refresca el TTL y resetea hits.
 */
export async function setCached({ usuarioId, endpoint, modelo, inputHash, response }) {
  if (!usuarioId || !endpoint || !modelo || !inputHash) return
  const expiresAt = new Date(Date.now() + ttlSeconds() * 1000)
  let json
  try {
    json = JSON.stringify(response)
  } catch {
    return
  }
  // Hard cap defensivo: si el response es absurdamente grande no lo
  // guardamos (sería un bug del LLM, no algo a propagar a la BD).
  if (json.length > 64 * 1024) return
  try {
    await db
      .insert(llmCache)
      .values({ usuarioId, endpoint, modelo, inputHash, responseJson: json, expiresAt })
      .onConflictDoUpdate({
        target: [llmCache.usuarioId, llmCache.endpoint, llmCache.modelo, llmCache.inputHash],
        set: { responseJson: json, expiresAt, hits: 0 },
      })
  } catch (e) {
    logger.warn('llmCache.setCached fallo', { error: e?.message })
  }
}

/**
 * Borra entradas expiradas. Llamar desde cron/scheduler.
 * @returns {Promise<number>} cantidad borrada (best-effort).
 */
export async function purgeExpired() {
  try {
    const result = await db.delete(llmCache).where(lt(llmCache.expiresAt, new Date()))
    return result?.rowCount ?? 0
  } catch (e) {
    logger.warn('llmCache.purgeExpired fallo', { error: e?.message })
    return 0
  }
}
