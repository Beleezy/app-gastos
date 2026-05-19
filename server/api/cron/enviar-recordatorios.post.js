// Cron: envía recordatorios push de gastos planificados con fecha mañana.
// También notifica deudas vencidas (fecha_pago < hoy y estado != pagado).
// Recomendado correr 1x/día (08:00 hora local). Auth: X-Cron-Secret.

import { db } from '../../utils/db.js'
import {
  gastosPlanificados,
  planesMensuales,
  categorias,
  deudas,
  personasEntidades,
  suscripcionesPush,
} from '../../database/schema.js'
import { eq, and, lt, sql, isNull, inArray } from 'drizzle-orm'
import { sendPush } from '../../utils/webPushSender.js'
import { logger } from '../../utils/logger.js'

export default defineEventHandler(async (event) => {
  const secret = process.env.CRON_SECRET
  const got = getRequestHeader(event, 'x-cron-secret')
  if (!secret || !got || secret !== got) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // ── 1. Planificados con fecha mañana ──
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const manana = new Date(hoy)
  manana.setDate(hoy.getDate() + 1)
  const mananaStr = manana.toISOString().split('T')[0]
  const hoyStr = hoy.toISOString().split('T')[0]

  const planificadosManana = await db
    .select({
      id: gastosPlanificados.id,
      usuarioId: planesMensuales.usuarioId,
      concepto: gastosPlanificados.concepto,
      monto: gastosPlanificados.montoEstimado,
      categoria: categorias.nombre,
    })
    .from(gastosPlanificados)
    .innerJoin(planesMensuales, eq(gastosPlanificados.planMensualId, planesMensuales.id))
    .leftJoin(categorias, eq(gastosPlanificados.categoriaId, categorias.id))
    .where(and(
      eq(gastosPlanificados.fechaProbablePago, mananaStr),
      eq(gastosPlanificados.estado, 'pendiente'),
    ))

  // ── 2. Deudas vencidas ──
  const deudasVencidas = await db
    .select({
      id: deudas.id,
      usuarioId: deudas.usuarioId,
      concepto: deudas.concepto,
      montoPendiente: deudas.montoPendiente,
      tipoDeuda: deudas.tipoDeuda,
      personaNombre: personasEntidades.nombre,
    })
    .from(deudas)
    .innerJoin(personasEntidades, eq(deudas.personaEntidadId, personasEntidades.id))
    .where(and(
      isNull(deudas.deletedAt),
      lt(deudas.fechaPago, hoyStr),
      sql`${deudas.estado} IN ('pendiente', 'parcial')`,
    ))

  // ── 3. Agrupar por usuario y enviar ──
  const usuarios = new Set([
    ...planificadosManana.map((p) => p.usuarioId),
    ...deudasVencidas.map((d) => d.usuarioId),
  ])

  if (usuarios.size === 0) {
    return { enviados: 0, planificados: 0, deudas: 0, suscripcionesEliminadas: 0 }
  }

  // Una sola query para todas las suscripciones de los usuarios afectados.
  const subs = await db
    .select()
    .from(suscripcionesPush)
    .where(inArray(suscripcionesPush.usuarioId, Array.from(usuarios)))

  const subsByUser = new Map()
  for (const s of subs) {
    if (!subsByUser.has(s.usuarioId)) subsByUser.set(s.usuarioId, [])
    subsByUser.get(s.usuarioId).push(s)
  }

  let enviados = 0
  const goneEndpoints = []

  async function enviarA(usuarioId, payload) {
    const userSubs = subsByUser.get(usuarioId) || []
    for (const sub of userSubs) {
      const result = await sendPush({
        subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      })
      if (result.ok) enviados++
      else if (result.gone) goneEndpoints.push(sub.endpoint)
    }
  }

  // Agrupar planificados por usuario para enviar UNA notificación.
  const planByUser = new Map()
  for (const p of planificadosManana) {
    if (!planByUser.has(p.usuarioId)) planByUser.set(p.usuarioId, [])
    planByUser.get(p.usuarioId).push(p)
  }

  for (const [usuarioId, items] of planByUser) {
    const titulo = items.length === 1
      ? `Mañana: ${items[0].concepto}`
      : `${items.length} gastos planificados para mañana`
    const body = items.length === 1
      ? `S/ ${parseFloat(items[0].monto).toFixed(2)} · ${items[0].categoria || ''}`
      : items.slice(0, 3).map((i) => i.concepto).join(', ') + (items.length > 3 ? '...' : '')
    await enviarA(usuarioId, {
      title: titulo,
      body,
      tag: 'recordatorio-planificado',
      url: '/planificador',
    })
  }

  // Agrupar deudas vencidas por usuario.
  const deudasByUser = new Map()
  for (const d of deudasVencidas) {
    if (!deudasByUser.has(d.usuarioId)) deudasByUser.set(d.usuarioId, [])
    deudasByUser.get(d.usuarioId).push(d)
  }

  for (const [usuarioId, items] of deudasByUser) {
    const titulo = items.length === 1
      ? `Deuda vencida: ${items[0].concepto}`
      : `${items.length} deudas vencidas`
    const body = items.length === 1
      ? `${items[0].tipoDeuda === 'me_deben' ? 'Te debe' : 'Debes a'} ${items[0].personaNombre} · S/ ${parseFloat(items[0].montoPendiente).toFixed(2)}`
      : `Revisa el resumen de deudas.`
    await enviarA(usuarioId, {
      title: titulo,
      body,
      tag: 'deudas-vencidas',
      url: '/deudas',
    })
  }

  // Limpiar suscripciones expiradas (410 Gone).
  let suscripcionesEliminadas = 0
  if (goneEndpoints.length > 0) {
    const r = await db
      .delete(suscripcionesPush)
      .where(inArray(suscripcionesPush.endpoint, goneEndpoints))
      .returning({ id: suscripcionesPush.id })
    suscripcionesEliminadas = r.length
  }

  const result = {
    enviados,
    planificados: planificadosManana.length,
    deudas: deudasVencidas.length,
    suscripcionesEliminadas,
  }
  logger.info('recordatorios cron ejecutado', result)
  return result
})
