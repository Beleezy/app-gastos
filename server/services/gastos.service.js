// Capa de servicios de gastos. Ver §2.1 / §4.7 de planifica.md.
// Los handlers HTTP delegan aquí toda la lógica de negocio + acceso a DB.

import { eq, and, sql, isNull, between } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { gastos, categorias, presupuestosCategoria, suscripcionesPush } from '../database/schema.js'
import { getFechaHoraLocalUsuario } from '../utils/fechaLocal.js'
import { assertOwner } from '../utils/assertOwner.js'
import { sendPush } from '../utils/webPushSender.js'
import { logger } from '../utils/logger.js'

/**
 * Crea un gasto y devuelve la versión enriquecida con datos de categoría.
 *
 * @param {object} input
 * @param {string} input.usuarioId
 * @param {object} input.body Body validado por Zod (gastoCreateSchema).
 */
export async function crearGasto({ usuarioId, body }) {
  if (!body.categoriaId) {
    const err = new Error('La categoría es obligatoria')
    err.statusCode = 400
    throw err
  }

  const { fecha: fechaLocal, hora: horaLocal } = await getFechaHoraLocalUsuario(usuarioId)
  const fechaHoy = body.fecha || fechaLocal
  const horaActual = body.hora || horaLocal

  const [gasto] = await db
    .insert(gastos)
    .values({
      usuarioId,
      categoriaId: body.categoriaId,
      concepto: body.concepto.trim(),
      monto: String(body.monto),
      fecha: fechaHoy,
      hora: horaActual,
      metodoRegistro: body.metodoRegistro || 'manual',
      transcripcionVoz: body.transcripcionVoz || null,
      notas: body.notas || null,
      gastoPlanificadoId: body.gastoPlanificadoId || null,
    })
    .returning()

  const [cat] = await db
    .select()
    .from(categorias)
    .where(eq(categorias.id, gasto.categoriaId))
    .limit(1)

  // Submódulo presupuestos por categoría: revisar si este gasto hizo
  // cruzar el umbral de alerta. Fire-and-forget — un fallo aquí no debe
  // romper la creación del gasto.
  verificarAlertaPresupuesto({ usuarioId, gasto, categoria: cat }).catch((e) => {
    logger.warn('alerta presupuesto falló', { message: e?.message })
  })

  return {
    ...gasto,
    monto: parseFloat(gasto.monto),
    categoriaNombre: cat?.nombre,
    categoriaIcono: cat?.icono,
    categoriaColor: cat?.color,
  }
}

// Helper: chequea si el gasto recién creado cruza el umbral del presupuesto
// de su categoría. Si pasa el límite por primera vez (pctAntes < umbral &&
// pctAhora >= umbral), envía push a todas las suscripciones del usuario.
// Evita spam: solo dispara en el "cruce", no en cada gasto subsiguiente.
async function verificarAlertaPresupuesto({ usuarioId, gasto, categoria }) {
  if (!gasto?.categoriaId) return
  const [pcat] = await db
    .select()
    .from(presupuestosCategoria)
    .where(and(
      eq(presupuestosCategoria.usuarioId, usuarioId),
      eq(presupuestosCategoria.categoriaId, gasto.categoriaId),
    ))
    .limit(1)
  if (!pcat) return

  const limite = parseFloat(pcat.montoMensual)
  if (!(limite > 0)) return
  const umbralPct = Number(pcat.alertaUmbral) || 80

  const [anio, mes] = String(gasto.fecha).split('-').map(Number)
  const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`
  const ultimoDiaNum = new Date(anio, mes, 0).getDate()
  const ultimaFecha = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`

  const [agg] = await db
    .select({ total: sql`COALESCE(SUM(${gastos.monto}), 0)` })
    .from(gastos)
    .where(and(
      eq(gastos.usuarioId, usuarioId),
      eq(gastos.categoriaId, gasto.categoriaId),
      isNull(gastos.deletedAt),
      between(gastos.fecha, primerDia, ultimaFecha),
    ))

  const total = parseFloat(agg.total)
  const totalAntes = total - parseFloat(gasto.monto)
  const pctAhora = (total / limite) * 100
  const pctAntes = (totalAntes / limite) * 100

  let titulo = null
  let cuerpo = null
  if (pctAntes < 100 && pctAhora >= 100) {
    titulo = '⚠️ Presupuesto excedido'
    cuerpo = `Superaste el presupuesto de ${categoria?.nombre || 'la categoría'} (${pctAhora.toFixed(0)}%).`
  } else if (pctAntes < umbralPct && pctAhora >= umbralPct) {
    titulo = '🔔 Alerta de presupuesto'
    cuerpo = `Llegaste al ${pctAhora.toFixed(0)}% del presupuesto de ${categoria?.nombre || 'la categoría'}.`
  } else {
    return
  }

  const subs = await db
    .select()
    .from(suscripcionesPush)
    .where(eq(suscripcionesPush.usuarioId, usuarioId))

  for (const s of subs) {
    sendPush({
      subscription: { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      payload: { titulo, cuerpo, url: '/presupuestos' },
    }).catch(() => {})
  }
}

/**
 * Detecta posibles duplicados al confirmar gastos por voz/foto.
 * Considera duplicado un gasto del mismo usuario, mismo día y monto en
 * un rango de ±0.5%, con concepto similar (case-insensitive prefix).
 *
 * Ver §5.B punto 3 de planifica.md.
 *
 * @param {object} input
 * @param {string} input.usuarioId
 * @param {Array<{concepto: string, monto: number, fecha: string}>} input.candidatos
 * @returns Array<{candidato, duplicados: Array<gasto>}>
 */
/**
 * Helper puro: dado un set de candidatos y un set de gastos
 * existentes (mismo formato), devuelve para cada candidato sus
 * potenciales duplicados aplicando reglas de monto similar y concepto
 * por prefijo. Extraído de detectarDuplicados para testabilidad.
 */
export function matchDuplicados(candidatos, existentes) {
  if (!Array.isArray(candidatos) || candidatos.length === 0) return []
  const ex = Array.isArray(existentes) ? existentes : []
  const tolerancia = (m) => Math.max(0.05, Math.abs(parseFloat(m)) * 0.005)
  const norm = (s) => String(s || '').trim().toLowerCase()

  return candidatos.map((c) => {
    const cm = parseFloat(c.monto)
    const tol = tolerancia(cm)
    const cn = norm(c.concepto)
    const duplicados = ex.filter((g) => {
      if (g.fecha !== c.fecha) return false
      const gm = parseFloat(g.monto)
      if (Math.abs(gm - cm) > tol) return false
      const gn = norm(g.concepto)
      return gn === cn || gn.startsWith(cn) || cn.startsWith(gn)
    })
    return { candidato: c, duplicados }
  })
}

export async function detectarDuplicados({ usuarioId, candidatos }) {
  if (!Array.isArray(candidatos) || candidatos.length === 0) return []

  const fechas = [...new Set(candidatos.map((c) => c.fecha).filter(Boolean))]
  if (fechas.length === 0) return []

  const existentes = await db
    .select({
      id: gastos.id,
      concepto: gastos.concepto,
      monto: gastos.monto,
      fecha: gastos.fecha,
    })
    .from(gastos)
    .where(and(eq(gastos.usuarioId, usuarioId), isNull(gastos.deletedAt), sql`${gastos.fecha} IN (${sql.join(fechas, sql`, `)})`))

  return matchDuplicados(candidatos, existentes)
}

/**
 * Devuelve un gasto por id, validando ownership.
 * @returns gasto enriquecido o null si no existe / no pertenece al usuario.
 */
export async function obtenerGastoPropio({ usuarioId, gastoId }) {
  const [gasto] = await db
    .select()
    .from(gastos)
    .where(and(eq(gastos.id, gastoId), eq(gastos.usuarioId, usuarioId), isNull(gastos.deletedAt)))
    .limit(1)

  if (!gasto) return null

  const [cat] = await db
    .select()
    .from(categorias)
    .where(eq(categorias.id, gasto.categoriaId))
    .limit(1)

  return {
    ...gasto,
    monto: parseFloat(gasto.monto),
    categoriaNombre: cat?.nombre,
    categoriaIcono: cat?.icono,
    categoriaColor: cat?.color,
  }
}
