// Helpers de paginación cursor-based para endpoints de listado.
// Ver §2.3 de planifica.md.
//
// Uso típico:
//   const { cursor, limit } = parsePaginacionQuery(getQuery(event))
//   const filas = await db.select()...
//     .orderBy(desc(gastos.fecha), desc(gastos.id))
//     .limit(limit + 1)            // pedir uno extra para saber si hay más
//   const result = paginarResultado(filas, limit, (g) => g.fecha + '|' + g.id)
//   return result   // { items, nextCursor, hasMore }

/**
 * Convierte query params en (cursor, limit) seguros.
 *
 * @param {object} query  Resultado de getQuery(event).
 * @param {number} maxLimit Tope superior para evitar abusos.
 */
export function parsePaginacionQuery(query = {}, { defaultLimit = 50, maxLimit = 200 } = {}) {
  let limit = parseInt(query.limit, 10)
  if (!Number.isFinite(limit) || limit <= 0) limit = defaultLimit
  if (limit > maxLimit) limit = maxLimit
  const cursor =
    typeof query.cursor === 'string' && query.cursor.trim() ? query.cursor.trim() : null
  return { cursor, limit }
}

/**
 * Empaqueta el resultado paginado.
 *
 * @param {Array} filas  Array obtenido de la query (`limit + 1` items).
 * @param {number} limit  Tamaño real de página solicitado.
 * @param {(row) => string} extractCursor  Cómo derivar el cursor de un row.
 */
export function paginarResultado(filas, limit, extractCursor) {
  const hasMore = filas.length > limit
  const items = hasMore ? filas.slice(0, limit) : filas
  const last = items[items.length - 1]
  const nextCursor = hasMore && last ? extractCursor(last) : null
  return { items, nextCursor, hasMore }
}

/**
 * Codifica un cursor de varios campos en un solo string base64 url-safe.
 */
export function encodeCursor(parts) {
  const json = JSON.stringify(parts)
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }
  return Buffer.from(json, 'utf8').toString('base64url')
}

/**
 * Decodifica un cursor a su array original. Devuelve null si inválido.
 */
export function decodeCursor(cursor) {
  if (!cursor) return null
  try {
    let str
    if (typeof atob === 'function') {
      const padded = cursor.replace(/-/g, '+').replace(/_/g, '/')
      str = decodeURIComponent(escape(atob(padded)))
    } else {
      str = Buffer.from(cursor, 'base64url').toString('utf8')
    }
    return JSON.parse(str)
  } catch {
    return null
  }
}
