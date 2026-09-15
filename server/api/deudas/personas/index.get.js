import { db } from '../../../utils/db.js'
import { personasEntidades, deudas } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { getFechaHoraLocalUsuario } from '../../../utils/fechaLocal.js'
import { eq, and, sql, isNull } from 'drizzle-orm'
import { validateQuery } from '../../../utils/validate.js'
import { personasListQuerySchema } from '~/shared/schemas/deudas.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  // `tipo` iba crudo a un `eq()` contra el enum: `?tipo=basura` era un 500
  // con la consulta dentro. Y este listado se carga en cada visita a /deudas.
  const { tipo } = validateQuery(event, personasListQuerySchema) // me_deben | yo_debo | undefined
  const { fecha: hoy } = await getFechaHoraLocalUsuario(usuarioId)

  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')

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
      totalPendiente:
        sql`COALESCE(SUM(CASE WHEN ${deudas.estado} IN ('pendiente', 'parcial') THEN CAST(${deudas.montoPendiente} AS NUMERIC) ELSE 0 END), 0)`.as(
          'total_pendiente',
        ),
      totalDeudas: sql`COUNT(${deudas.id})`.as('total_deudas'),
      deudasActivas:
        sql`COUNT(CASE WHEN ${deudas.estado} IN ('pendiente', 'parcial') THEN 1 END)`.as(
          'deudas_activas',
        ),
      ultimoMovimiento: sql`MAX(${deudas.updatedAt})`.as('ultimo_movimiento'),
      countVencidas:
        sql`COUNT(CASE WHEN ${deudas.estado} IN ('pendiente', 'parcial') AND ${deudas.fechaPago} IS NOT NULL AND ${deudas.fechaPago} < ${hoy} THEN 1 END)`.as(
          'count_vencidas',
        ),
      montoVencido:
        sql`COALESCE(SUM(CASE WHEN ${deudas.estado} IN ('pendiente', 'parcial') AND ${deudas.fechaPago} IS NOT NULL AND ${deudas.fechaPago} < ${hoy} THEN CAST(${deudas.montoPendiente} AS NUMERIC) ELSE 0 END), 0)`.as(
          'monto_vencido',
        ),
      fechaProximaVencer:
        sql`MIN(CASE WHEN ${deudas.estado} IN ('pendiente', 'parcial') AND ${deudas.fechaPago} IS NOT NULL AND ${deudas.fechaPago} >= ${hoy} THEN ${deudas.fechaPago} END)`.as(
          'fecha_proxima_vencer',
        ),
    })
    .from(personasEntidades)
    .leftJoin(
      deudas,
      and(
        eq(deudas.personaEntidadId, personasEntidades.id),
        isNull(deudas.deletedAt),
        tipo ? eq(deudas.tipoDeuda, tipo) : undefined,
      ),
    )
    .where(and(eq(personasEntidades.usuarioId, usuarioId), isNull(personasEntidades.deletedAt)))
    .groupBy(personasEntidades.id)
    .orderBy(sql`MAX(${deudas.updatedAt}) DESC NULLS LAST`)

  return personasRaw.map((p) => {
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
