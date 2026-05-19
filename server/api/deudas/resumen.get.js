import { db } from '../../utils/db.js'
import { deudas } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { getFechaHoraLocalUsuario } from '../../utils/fechaLocal.js'
import { eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const { fecha: hoy } = await getFechaHoraLocalUsuario(usuarioId)

  // SWR corto: el resumen cambia con cada pago/deuda; 60s permite que
  // navegaciones rápidas y el SW sirvan cache, sin desfasar más de 1 min.
  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')

  const [resumen] = await db
    .select({
      totalMeDeben: sql`COALESCE(SUM(CASE WHEN ${deudas.tipoDeuda} = 'me_deben' AND ${deudas.estado} IN ('pendiente', 'parcial') THEN CAST(${deudas.montoPendiente} AS NUMERIC) ELSE 0 END), 0)`.as('total_me_deben'),
      totalYoDebo: sql`COALESCE(SUM(CASE WHEN ${deudas.tipoDeuda} = 'yo_debo' AND ${deudas.estado} IN ('pendiente', 'parcial') THEN CAST(${deudas.montoPendiente} AS NUMERIC) ELSE 0 END), 0)`.as('total_yo_debo'),
      countMeDeben: sql`COUNT(CASE WHEN ${deudas.tipoDeuda} = 'me_deben' AND ${deudas.estado} IN ('pendiente', 'parcial') THEN 1 END)`.as('count_me_deben'),
      countYoDebo: sql`COUNT(CASE WHEN ${deudas.tipoDeuda} = 'yo_debo' AND ${deudas.estado} IN ('pendiente', 'parcial') THEN 1 END)`.as('count_yo_debo'),
      montoVencidoMeDeben: sql`COALESCE(SUM(CASE WHEN ${deudas.tipoDeuda} = 'me_deben' AND ${deudas.estado} IN ('pendiente', 'parcial') AND ${deudas.fechaPago} IS NOT NULL AND ${deudas.fechaPago} < ${hoy} THEN CAST(${deudas.montoPendiente} AS NUMERIC) ELSE 0 END), 0)`.as('monto_vencido_me_deben'),
      countVencidasMeDeben: sql`COUNT(CASE WHEN ${deudas.tipoDeuda} = 'me_deben' AND ${deudas.estado} IN ('pendiente', 'parcial') AND ${deudas.fechaPago} IS NOT NULL AND ${deudas.fechaPago} < ${hoy} THEN 1 END)`.as('count_vencidas_me_deben'),
      montoVencidoYoDebo: sql`COALESCE(SUM(CASE WHEN ${deudas.tipoDeuda} = 'yo_debo' AND ${deudas.estado} IN ('pendiente', 'parcial') AND ${deudas.fechaPago} IS NOT NULL AND ${deudas.fechaPago} < ${hoy} THEN CAST(${deudas.montoPendiente} AS NUMERIC) ELSE 0 END), 0)`.as('monto_vencido_yo_debo'),
      countVencidasYoDebo: sql`COUNT(CASE WHEN ${deudas.tipoDeuda} = 'yo_debo' AND ${deudas.estado} IN ('pendiente', 'parcial') AND ${deudas.fechaPago} IS NOT NULL AND ${deudas.fechaPago} < ${hoy} THEN 1 END)`.as('count_vencidas_yo_debo'),
    })
    .from(deudas)
    .where(eq(deudas.usuarioId, usuarioId))

  const totalMeDeben = parseFloat(resumen.totalMeDeben)
  const totalYoDebo = parseFloat(resumen.totalYoDebo)

  return {
    totalMeDeben,
    totalYoDebo,
    balanceNeto: totalMeDeben - totalYoDebo,
    countMeDeben: Number(resumen.countMeDeben),
    countYoDebo: Number(resumen.countYoDebo),
    montoVencidoMeDeben: parseFloat(resumen.montoVencidoMeDeben),
    countVencidasMeDeben: Number(resumen.countVencidasMeDeben),
    montoVencidoYoDebo: parseFloat(resumen.montoVencidoYoDebo),
    countVencidasYoDebo: Number(resumen.countVencidasYoDebo),
  }
})
