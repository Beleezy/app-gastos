// Idempotencia de mutaciones reintentadas desde la cola offline.
//
// El cliente (composables/useSyncQueue.js) manda un header
// `Idempotency-Key` con un id estable por mutación encolada. Si una
// petición posterior trae el mismo id, se devuelve la respuesta original
// en vez de re-aplicar la operación.
//
// ── Por qué está en la BD y no en memoria ──
//
// Antes esto era un Map del proceso. El archivo reconocía el agujero:
// "en despliegues multi-instancia un retry puede llegar a otra instancia
// y no encontrar el slot → la operación se aplica dos veces". En Vercel
// eso no es un caso raro, es el normal — y el consumidor es la cola
// offline, que reintenta justo cuando vuelve la red, que es cuando hay
// más peticiones en vuelo. El síntoma es el peor posible para una app de
// finanzas: gastos duplicados que el usuario no registró.
//
// El índice único de `idempotency_keys` (migración 0034) es lo que hace
// la reserva atómica ENTRE instancias: dos peticiones concurrentes con la
// misma clave compiten por insertar y solo una gana.
//
// No se usó Upstash (que ya existe para rate-limit) porque su driver se
// degrada EN SILENCIO al Map cuando no está configurado: sería el mismo
// agujero con más piezas. La BD siempre está.
//
// ── Qué NO garantiza ──
//
// La red de seguridad es best-effort a propósito: si la tabla no
// responde, la operación sigue adelante sin protección. Que la
// idempotencia esté caída no puede impedirle a alguien registrar un
// gasto — el fallo que evita es más barato que el que causaría.

import { and, eq, lt } from 'drizzle-orm'
import { db } from './db.js'
import { idempotencyKeys } from '../database/schema.js'

const TTL_MS = 24 * 60 * 60 * 1000

// Ventana tras la cual una reserva sin respuesta se considera abandonada
// (el proceso que la tomó murió a mitad). Más larga que cualquier handler
// razonable, más corta que el TTL.
const EN_VUELO_MS = 2 * 60 * 1000

// El límite de la columna `clave` es varchar(200). Una clave más larga no
// se rechaza con un 500 del driver: simplemente no se protege.
const MAX_CLAVE = 200

function leerClave(event) {
  const raw = getRequestHeader(event, 'idempotency-key')
  if (typeof raw !== 'string') return null
  const clave = raw.trim()
  if (!clave || clave.length > MAX_CLAVE) return null
  return clave
}

function identidad(event, usuarioId, clave) {
  return {
    usuarioId,
    metodo: event.method || 'POST',
    // El path se guarda sin query string: el `_v`/`_p` que el cliente
    // añade como cache-buster cambia entre reintentos y partiría la
    // identidad de una misma mutación.
    path: (event.path || '').split('?')[0].slice(0, 500),
    clave,
  }
}

function condicion(id) {
  return and(
    eq(idempotencyKeys.usuarioId, id.usuarioId),
    eq(idempotencyKeys.metodo, id.metodo),
    eq(idempotencyKeys.path, id.path),
    eq(idempotencyKeys.clave, id.clave),
  )
}

/**
 * Ejecuta `fn` bajo protección de idempotencia.
 *
 * Es un envoltorio y no un par reservar/completar a propósito: con dos
 * llamadas separadas es fácil olvidar liberar la reserva cuando el
 * handler falla, y una reserva huérfana bloquea el reintento legítimo
 * durante todo el TTL.
 *
 * @param {object} event Nitro event.
 * @param {string} usuarioId
 * @param {() => Promise<any>} fn El trabajo a proteger.
 */
export async function conIdempotencia(event, usuarioId, fn) {
  const clave = leerClave(event)
  if (!clave || !usuarioId) return fn()

  const id = identidad(event, usuarioId, clave)
  const ahora = Date.now()

  let reservada
  try {
    const filas = await db
      .insert(idempotencyKeys)
      .values({ ...id, responseJson: null, expiresAt: new Date(ahora + TTL_MS) })
      .onConflictDoNothing()
      .returning()
    reservada = filas.length > 0
  } catch {
    // La tabla no responde: seguir sin protección (ver cabecera).
    return fn()
  }

  if (!reservada) {
    const previa = await leerPrevia(id, ahora)
    if (previa.tipo === 'respuesta') {
      setResponseHeader(event, 'X-Idempotent-Replay', 'true')
      return previa.valor
    }
    if (previa.tipo === 'en_vuelo') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: 'Esta operación ya se está procesando. Espera un momento.',
      })
    }
    // Reserva caducada o abandonada: se toma prestada actualizándola.
    // Si otro proceso gana la carrera aquí, el peor caso es el que ya
    // teníamos antes de esta tabla — no uno nuevo.
    await db
      .update(idempotencyKeys)
      .set({ responseJson: null, expiresAt: new Date(ahora + TTL_MS), createdAt: new Date() })
      .where(condicion(id))
  }

  let resultado
  try {
    resultado = await fn()
  } catch (e) {
    // Liberar: sin esto un fallo transitorio dejaría la clave reservada
    // sin respuesta y el reintento legítimo chocaría con su propia
    // reserva huérfana en vez de volver a intentarlo.
    await db
      .delete(idempotencyKeys)
      .where(condicion(id))
      .catch(() => {})
    throw e
  }

  try {
    await db
      .update(idempotencyKeys)
      .set({ responseJson: JSON.stringify(resultado ?? null) })
      .where(condicion(id))
  } catch {
    // La operación YA se aplicó. No poder anotar la respuesta solo
    // degrada el reintento (repetiría el trabajo); tirar aquí sería
    // peor: el cliente creería que falló algo que sí ocurrió.
  }

  return resultado
}

/**
 * Borra las reservas ya expiradas. La llama el cron de purgado: sin ella
 * la tabla solo crece, porque el TTL se evalúa al leer y una clave que
 * nunca se reintenta no se lee nunca.
 *
 * @returns {Promise<number>} filas borradas
 */
export async function purgarIdempotenciasExpiradas() {
  const borradas = await db
    .delete(idempotencyKeys)
    .where(lt(idempotencyKeys.expiresAt, new Date()))
    .returning({ id: idempotencyKeys.id })
  return borradas.length
}

async function leerPrevia(id, ahora) {
  let fila
  try {
    const filas = await db.select().from(idempotencyKeys).where(condicion(id)).limit(1)
    fila = filas[0]
  } catch {
    return { tipo: 'libre' }
  }

  if (!fila) return { tipo: 'libre' }

  const expirada = fila.expiresAt && new Date(fila.expiresAt).getTime() < ahora
  if (expirada) return { tipo: 'libre' }

  if (fila.responseJson != null) {
    try {
      return { tipo: 'respuesta', valor: JSON.parse(fila.responseJson) }
    } catch {
      // Respuesta corrupta: tratarla como si no existiera es preferible a
      // devolverle basura al cliente.
      return { tipo: 'libre' }
    }
  }

  const creada = fila.createdAt ? new Date(fila.createdAt).getTime() : ahora
  if (ahora - creada > EN_VUELO_MS) return { tipo: 'libre' }
  return { tipo: 'en_vuelo' }
}
