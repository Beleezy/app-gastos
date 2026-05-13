// Helpers de sanitización para inputs que terminan en consultas SQL.
//
// Toda la app accede a la DB mediante Drizzle ORM con parámetros
// vinculados (placeholders), de modo que SQL injection clásico
// (`' OR 1=1 --`, etc.) no es viable. Aún así existen casos donde el
// valor del usuario se concatena dentro de un patrón con semántica
// extra — el ejemplo más común es LIKE / ILIKE, donde `%` y `_` son
// comodines: si el usuario los pasa, controla el patrón de match.
//
// Estos helpers normalizan esos casos y centralizan defensas-en-
// profundidad para no depender exclusivamente del ORM.

const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g // eslint-disable-line no-control-regex
const INVISIBLE = /[​-‏‪-‮⁠-⁯﻿]/g

/**
 * Limpia un string genérico antes de mandarlo a DB:
 * - normaliza Unicode (NFKC) para que homoglifos no esquiven validadores
 * - quita NUL y controles (PostgreSQL rechaza NUL en TEXT)
 * - quita zero-width / bidi override (vector de phishing en displays)
 * - recorta a maxLen
 *
 * Devuelve '' si el input no es string. NO valida ni rechaza: es
 * defensa en profundidad; la validación dura es Zod a nivel de schema.
 */
export function sanitizeString(value, maxLen = 1000) {
  if (value == null) return ''
  let text = String(value).normalize('NFKC').replace(CONTROL, '').replace(INVISIBLE, '')
  if (text.length > maxLen) text = text.slice(0, maxLen)
  return text.trim()
}

/**
 * Escapa los metacaracteres de LIKE/ILIKE (`%`, `_`, `\`) para que el
 * patrón de búsqueda use el valor literal del usuario. Sin esto, un
 * input como `%` matchea TODO y permite enumerar datos.
 *
 * Uso: `ilike(col, '%' + escapeLikePattern(q) + '%')`
 */
export function escapeLikePattern(value) {
  return sanitizeString(value, 500).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * Valida que un valor pueda usarse como identificador (UUID o entero).
 * Devuelve el valor original si pasa, null si no. Útil para `[id]`
 * routes cuando no se está validando con Zod en ese mismo handler.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function asIdentifier(value) {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (UUID_RE.test(trimmed)) return trimmed
  if (/^\d{1,18}$/.test(trimmed)) return trimmed
  return null
}
