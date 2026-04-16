import { db } from '../../../utils/db.js'
import { personasEntidades, deudas } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { getFechaHoraLocalUsuario } from '../../../utils/fechaLocal.js'
import { eq, and, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const query = getQuery(event)
  const tipo = query.tipo // 'me_deben' | 'yo_debo' | undefined (all)
  const { fecha: hoy } = await getFechaHoraLocalUsuario(usuarioId)

  // Get personas with aggregated debt totals
  const personasRaw = await db
    .select({
      id: personasEntidades.id,
      nombre: personasEntidades.nombre,
      tipo: personasEntidades.tipo,
      contacto: personasEntidades.contacto,
      notas: personasEntidades.notas,
      vinculadoUsuarioId: personasEntidades.vinculadoUsuarioId,
      vinculoParId: personasEntidades.vinculoParId,
      createdAt: personasEntidades.createdAt,
      totalPendiente: sql`COALESCE(SUM(CASE WHEN ${deudas.estado} IN ('pendiente', 'parcial') THEN CAST(${deudas.montoPendiente} AS NUMERIC) ELSE 0 END), 0)`.as('total_pendiente'),
      totalDeudas: sql`COUNT(${deudas.id})`.as('total_deudas'),
      deudasActivas: sql`COUNT(CASE WHEN ${deudas.estado} IN ('pendiente', 'parcial') THEN 1 END)`.as('deudas_activas'),
      ultimoMovimiento: sql`MAX(${deudas.updatedAt})`.as('ultimo_movimiento'),
      countVencidas: sql`COUNT(CASE WHEN ${deudas.estado} IN ('pendiente', 'parcial') AND ${deudas.fechaPago} IS NOT NULL AND ${deudas.fechaPago} < ${hoy} THEN 1 END)`.as('count_vencidas'),
      montoVencido: sql`COALESCE(SUM(CASE WHEN ${deudas.estado} IN ('pendiente', 'parcial') AND ${deudas.fechaPago} IS NOT NULL AND ${deudas.fechaPago} < ${hoy} THEN CAST(${deudas.montoPendiente} AS NUMERIC) ELSE 0 END), 0)`.as('monto_vencido'),
      fechaProximaVencer: sql`MIN(CASE WHEN ${deudas.estado} IN ('pendiente', 'parcial') AND ${deudas.fechaPago} IS NOT NULL AND ${deudas.fechaPago} >= ${hoy} THEN ${deudas.fechaPago} END)`.as('fecha_proxima_vencer'),
    })
    .from(personasEntidades)
    .leftJoin(deudas, and(
      eq(deudas.personaEntidadId, personasEntidades.id),
      tipo ? eq(deudas.tipoDeuda, tipo) : undefined
    ))
    .where(eq(personasEntidades.usuarioId, usuarioId))
    .groupBy(personasEntidades.id)
    .orderBy(sql`MAX(${deudas.updatedAt}) DESC NULLS LAST`)

  return personasRaw.map(p => {
    const countVencidas = Number(p.countVencidas)
    return {
      ...p,
      totalPendiente: parseFloat(p.totalPendiente),
      totalDeudas: Number(p.totalDeudas),
      deudasActivas: Number(p.deudasActivas),
      countVencidas,
      montoVencido: parseFloat(p.montoVencido),
      tieneVencidas: countVencidas > 0,
      fechaProximaVencer: p.fechaProximaVencer || null,
    }
  })
})
