// Catálogo de modelos de IA en la base de datos (tabla modelos_llm, 0036).
//
// Sustituye a la lista fija de GEMINI_MODEL: los handlers de voz/foto piden
// aquí los modelos activos por prioridad; cada petición registra si el
// modelo respondió o falló; un modelo que falla varias veces seguidas se
// apaga solo; y el descubrimiento (ListModels de Google) da de alta los
// nuevos y retira los que Google ya no lista.
//
// Reglas:
// - La parte pura (qué es candidato, qué prioridad, qué hacer con lo
//   descubierto) no toca la BD y está en tests/modelosLlm.test.js.
// - Cache de proceso con TTL corto y cota: cada lambda lee la tabla como
//   mucho una vez por minuto. Un cambio del superadmin tarda ese minuto en
//   llegar a las demás instancias — aceptable para un catálogo.
// - Si la tabla está vacía (primer arranque) se siembra desde GEMINI_MODEL
//   con origen 'entorno'; si la BD no responde se cae a esa misma lista
//   para que el registro por voz no dependa del catálogo.
// - Un 429 (cuota) o un 403 (clave) NO cuentan como fallo del modelo: son
//   capacidad o configuración, y castigar al modelo por eso lo apagaría en
//   el peor momento.

import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { db } from './db.js'
import { modelosLlm } from '../database/schema.js'
import { logger } from './logger.js'
import { parseModelList } from './geminiModels.js'

export const MAX_FALLOS_DEFAULT = 3
const CACHE_TTL_MS = 60 * 1000
const DIAS_PARA_REINTENTAR = 7
const LIST_MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

let cache = { at: 0, nombres: null }

export function invalidarCacheModelos() {
  cache = { at: 0, nombres: null }
}

export function maxFallosConsecutivos() {
  const n = parseInt(process.env.LLM_MODELO_MAX_FALLOS || '', 10)
  return Number.isFinite(n) && n > 0 ? n : MAX_FALLOS_DEFAULT
}

// ── Parte pura ──────────────────────────────────────────────────────────

export function normalizarNombreModelo(nombre) {
  return String(nombre || '')
    .trim()
    .replace(/^models\//, '')
}

/**
 * ¿Se activa solo al descubrirlo? Solo la familia "flash" de Gemini, que es
 * la del nivel gratuito, y sin variantes que no sirven para parsear JSON
 * (audio, tts, live, imagen, native) ni previews fechados/experimentales
 * que Google retira sin aviso. Todo lo demás se guarda apagado para que el
 * superadmin lo encienda a mano si quiere.
 */
export function esCandidatoAutomatico(nombre) {
  const n = normalizarNombreModelo(nombre).toLowerCase()
  if (!/^gemini-\d+(\.\d+)?-/.test(n)) return false
  if (!/flash/.test(n)) return false
  if (/(tts|audio|live|image|native|thinking|-exp\b|exp-|robotics|computer)/.test(n)) return false
  // "preview-05-20", "preview-09-2025": fechados → efímeros.
  if (/-\d{2}-\d{2,4}$/.test(n)) return false
  return true
}

/**
 * Prioridad por defecto (menor = se prueba antes): versión más nueva
 * primero y, a igual versión, la variante "lite" (más cuota gratuita)
 * antes que la normal. El superadmin puede pisarla.
 */
export function prioridadPorNombre(nombre) {
  const n = normalizarNombreModelo(nombre).toLowerCase()
  const m = /^gemini-(\d+)(?:\.(\d+))?/.exec(n)
  if (!m) return 900
  const major = parseInt(m[1], 10)
  const minor = parseInt(m[2] || '0', 10)
  const base = 1000 - (major * 100 + minor * 10)
  return Math.max(0, Math.min(1000, base + (/lite/.test(n) ? 0 : 5)))
}

/** Convierte la respuesta de ListModels en filas planas. */
export function parsearListaGoogle(data) {
  const modelos = Array.isArray(data?.models) ? data.models : []
  return modelos
    .map((m) => ({
      nombre: normalizarNombreModelo(m?.name),
      version: m?.version ? String(m.version).slice(0, 60) : null,
      descripcion: (m?.displayName || m?.description || '').slice(0, 500) || null,
      soportaGenerate: (m?.supportedGenerationMethods || []).includes('generateContent'),
    }))
    .filter((m) => m.nombre)
}

/**
 * Dado el catálogo actual y lo que respondió Google, decide qué insertar,
 * qué marcar como visto, qué retirar y qué reactivar. Puro.
 */
export function planificarDescubrimiento(actuales, encontrados, { ahora = new Date() } = {}) {
  const porNombre = new Map(actuales.map((a) => [a.nombre, a]))
  const generables = encontrados.filter((e) => e.soportaGenerate)
  const vistos = new Set(generables.map((e) => e.nombre))

  const nuevos = generables
    .filter((e) => !porNombre.has(e.nombre))
    .map((e) => ({
      nombre: e.nombre,
      origen: 'descubierto',
      activo: esCandidatoAutomatico(e.nombre),
      prioridad: prioridadPorNombre(e.nombre),
      version: e.version,
      descripcion: e.descripcion,
      descubiertoAt: ahora,
      vistoEnGoogleAt: ahora,
    }))

  const actualizados = generables
    .filter((e) => porNombre.has(e.nombre))
    .map((e) => ({ nombre: e.nombre, version: e.version, descripcion: e.descripcion }))

  // Google dejó de listarlo: solo se retiran los que no puso el superadmin
  // a mano, y solo si estaban encendidos (no hay nada que apagar si no).
  const retirados = actuales
    .filter((a) => a.activo && a.origen !== 'manual' && !vistos.has(a.nombre))
    .map((a) => a.nombre)

  // Lo apagó el sistema por fallos, sigue en Google y ya pasó la cuarentena:
  // segunda oportunidad.
  const limite = ahora.getTime() - DIAS_PARA_REINTENTAR * 24 * 60 * 60 * 1000
  const reactivados = actuales
    .filter((a) => !a.activo && a.desactivadoAuto && vistos.has(a.nombre))
    .filter((a) => !a.ultimoFalloAt || new Date(a.ultimoFalloAt).getTime() < limite)
    .map((a) => a.nombre)

  return { nuevos, actualizados, retirados, reactivados, vistos: [...vistos] }
}

/** Ordena filas del catálogo como las usa el runtime. */
export function ordenarModelos(filas) {
  return [...filas].sort(
    (a, b) => a.prioridad - b.prioridad || String(a.nombre).localeCompare(String(b.nombre)),
  )
}

/** ¿Este motivo de fallo es del modelo (y no de cuota o de la clave)? */
export function esFalloDelModelo(motivo) {
  const m = String(motivo || '').toLowerCase()
  if (!m) return false
  if (/\b429\b|cuota|quota|rate/.test(m)) return false
  if (/\b403\b|api key|permis/.test(m)) return false
  return true
}

// ── Acceso a datos ──────────────────────────────────────────────────────

function listaDeEntorno(runtimeConfig) {
  return parseModelList(
    runtimeConfig?.geminiModel || 'gemini-3.1-flash-lite-preview;gemini-2.5-flash',
  )
}

/** Todas las filas, ordenadas por prioridad. */
export async function listarModelos() {
  const filas = await db
    .select()
    .from(modelosLlm)
    .orderBy(asc(modelosLlm.prioridad), asc(modelosLlm.nombre))
  return filas
}

/**
 * Nombres de los modelos activos por prioridad. Es lo que consumen los
 * handlers de voz/foto en cada petición: cacheado un minuto por proceso.
 */
export async function listarModelosActivos({ runtimeConfig, imagen = false } = {}) {
  const ahora = Date.now()
  if (cache.nombres && ahora - cache.at < CACHE_TTL_MS) {
    return filtrarImagen(cache.nombres, imagen)
  }
  try {
    let filas = await db
      .select({
        nombre: modelosLlm.nombre,
        soportaImagen: modelosLlm.soportaImagen,
        prioridad: modelosLlm.prioridad,
      })
      .from(modelosLlm)
      .where(eq(modelosLlm.activo, true))
    if (!filas.length) {
      const [{ total }] = await db.select({ total: sql`count(*)::int` }).from(modelosLlm)
      if (total === 0) {
        // Primer arranque sin migración de datos: sembrar desde el entorno.
        const nombres = listaDeEntorno(runtimeConfig)
        if (nombres.length) {
          await db
            .insert(modelosLlm)
            .values(
              nombres.map((nombre, i) => ({
                nombre,
                origen: 'entorno',
                prioridad: Math.min(1000, prioridadPorNombre(nombre) + i),
              })),
            )
            .onConflictDoNothing()
          filas = nombres.map((nombre, i) => ({ nombre, soportaImagen: true, prioridad: i }))
        }
      }
    }
    const ordenadas = ordenarModelos(filas)
    cache = { at: ahora, nombres: ordenadas }
    return filtrarImagen(ordenadas, imagen)
  } catch (e) {
    logger.error('No se pudo leer modelos_llm; usando GEMINI_MODEL', { error: e })
    return listaDeEntorno(runtimeConfig)
  }
}

function filtrarImagen(filas, imagen) {
  const utiles = imagen ? filas.filter((f) => f.soportaImagen !== false) : filas
  return utiles.map((f) => f.nombre)
}

/** El modelo respondió bien: a cero los fallos seguidos. */
export async function registrarExito(nombre) {
  try {
    await db
      .update(modelosLlm)
      .set({ fallosConsecutivos: 0, ultimoExitoAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(modelosLlm.nombre, nombre),
          sql`${modelosLlm.fallosConsecutivos} > 0 OR ${modelosLlm.ultimoExitoAt} IS NULL OR ${modelosLlm.ultimoExitoAt} < now() - interval '1 hour'`,
        ),
      )
  } catch (e) {
    logger.warn('No se pudo registrar el éxito del modelo', { modelo: nombre, error: e })
  }
}

/**
 * El modelo agotó sus reintentos por un motivo suyo (404, 5xx, respuesta
 * inválida). Al llegar al umbral se apaga y deja de probarse hasta que el
 * superadmin lo encienda o el descubrimiento lo reactive.
 */
export async function registrarFallo(nombre, motivo) {
  if (!esFalloDelModelo(motivo)) return { apagado: false, contado: false }
  try {
    const umbral = maxFallosConsecutivos()
    const [fila] = await db
      .update(modelosLlm)
      .set({
        fallosConsecutivos: sql`${modelosLlm.fallosConsecutivos} + 1`,
        ultimoError: String(motivo).slice(0, 500),
        ultimoFalloAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(modelosLlm.nombre, nombre))
      .returning({ fallos: modelosLlm.fallosConsecutivos, activo: modelosLlm.activo })
    if (!fila) return { apagado: false, contado: false }
    if (fila.activo && fila.fallos >= umbral) {
      await db
        .update(modelosLlm)
        .set({ activo: false, desactivadoAuto: true, updatedAt: new Date() })
        .where(eq(modelosLlm.nombre, nombre))
      invalidarCacheModelos()
      logger.warn('Modelo apagado por fallos consecutivos', { modelo: nombre, fallos: fila.fallos })
      return { apagado: true, contado: true }
    }
    return { apagado: false, contado: true }
  } catch (e) {
    logger.warn('No se pudo registrar el fallo del modelo', { modelo: nombre, error: e })
    return { apagado: false, contado: false }
  }
}

/** Alta manual desde el superadmin. */
export async function crearModeloManual(nombre) {
  const limpio = normalizarNombreModelo(nombre)
  const [fila] = await db
    .insert(modelosLlm)
    .values({ nombre: limpio, origen: 'manual', prioridad: prioridadPorNombre(limpio) })
    .onConflictDoNothing()
    .returning()
  invalidarCacheModelos()
  return fila || null
}

export async function actualizarModelo(id, cambios) {
  const set = { updatedAt: new Date() }
  if (cambios.activo !== undefined) {
    set.activo = cambios.activo
    // Encenderlo a mano borra la marca automática y el contador: si vuelve
    // a fallar, vuelve a contar desde cero.
    if (cambios.activo) {
      set.desactivadoAuto = false
      set.fallosConsecutivos = 0
    }
  }
  if (cambios.prioridad !== undefined) set.prioridad = cambios.prioridad
  const [fila] = await db.update(modelosLlm).set(set).where(eq(modelosLlm.id, id)).returning()
  invalidarCacheModelos()
  return fila || null
}

export async function eliminarModelo(id) {
  const filas = await db
    .delete(modelosLlm)
    .where(eq(modelosLlm.id, id))
    .returning({ id: modelosLlm.id })
  invalidarCacheModelos()
  return filas.length
}

/** Trae TODAS las páginas de ListModels. */
export async function consultarModelosGoogle(apiKey, { fetchImpl = fetch } = {}) {
  const todos = []
  let pageToken = null
  for (let pagina = 0; pagina < 10; pagina++) {
    const url = new URL(LIST_MODELS_URL)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('pageSize', '100')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const res = await fetchImpl(url.toString())
    if (!res.ok) {
      const err = new Error(`Google respondió ${res.status} al listar modelos`)
      err.statusCode = res.status === 403 || res.status === 400 ? 502 : 502
      throw err
    }
    const data = await res.json()
    todos.push(...parsearListaGoogle(data))
    pageToken = data?.nextPageToken || null
    if (!pageToken) break
  }
  return todos
}

/**
 * Descubrimiento completo: consulta a Google, aplica el plan en una
 * transacción y devuelve el resumen. Lo llaman el endpoint superadmin y el
 * cron semanal.
 */
export async function descubrirModelos({ apiKey, fetchImpl } = {}) {
  if (!apiKey) {
    const err = new Error('Sin GEMINI_API_KEY: no se puede consultar la lista de modelos')
    err.statusCode = 503
    throw err
  }
  const encontrados = await consultarModelosGoogle(apiKey, { fetchImpl })
  const actuales = await db.select().from(modelosLlm)
  const ahora = new Date()
  const plan = planificarDescubrimiento(actuales, encontrados, { ahora })

  await db.transaction(async (tx) => {
    if (plan.nuevos.length) await tx.insert(modelosLlm).values(plan.nuevos).onConflictDoNothing()
    if (plan.vistos.length) {
      await tx
        .update(modelosLlm)
        .set({ vistoEnGoogleAt: ahora, updatedAt: ahora })
        .where(inArray(modelosLlm.nombre, plan.vistos))
    }
    if (plan.retirados.length) {
      await tx
        .update(modelosLlm)
        .set({
          activo: false,
          ultimoError: 'Ya no aparece en la lista de modelos de Google',
          updatedAt: ahora,
        })
        .where(inArray(modelosLlm.nombre, plan.retirados))
    }
    if (plan.reactivados.length) {
      await tx
        .update(modelosLlm)
        .set({ activo: true, desactivadoAuto: false, fallosConsecutivos: 0, updatedAt: ahora })
        .where(inArray(modelosLlm.nombre, plan.reactivados))
    }
  })
  invalidarCacheModelos()
  const resumen = {
    encontrados: encontrados.filter((e) => e.soportaGenerate).length,
    nuevos: plan.nuevos.map((n) => n.nombre),
    activadosAuto: plan.nuevos.filter((n) => n.activo).map((n) => n.nombre),
    retirados: plan.retirados,
    reactivados: plan.reactivados,
  }
  logger.info('Descubrimiento de modelos', resumen)
  return resumen
}
