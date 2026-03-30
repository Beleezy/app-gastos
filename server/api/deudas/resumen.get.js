import { db } from '../../utils/db.js'
import { deudas } from '../../database/schema.js'
import { getUsuarioId } from '../../utils/getUsuario.js'
import { eq, and, sql, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioId()

  const [resumen] = await db
    .select({
      totalMeDeben: sql`COALESCE(SUM(CASE WHEN ${deudas.tipoDeuda} = 'me_deben' AND ${deudas.estado} IN ('pendiente', 'parcial') THEN CAST(${deudas.montoPendiente} AS NUMERIC) ELSE 0 END), 0)`.as('total_me_deben'),
      totalYoDebo: sql`COALESCE(SUM(CASE WHEN ${deudas.tipoDeuda} = 'yo_debo' AND ${deudas.estado} IN ('pendiente', 'parcial') THEN CAST(${deudas.montoPendiente} AS NUMERIC) ELSE 0 END), 0)`.as('total_yo_debo'),
      countMeDeben: sql`COUNT(CASE WHEN ${deudas.tipoDeuda} = 'me_deben' AND ${deudas.estado} IN ('pendiente', 'parcial') THEN 1 END)`.as('count_me_deben'),
      countYoDebo: sql`COUNT(CASE WHEN ${deudas.tipoDeuda} = 'yo_debo' AND ${deudas.estado} IN ('pendiente', 'parcial') THEN 1 END)`.as('count_yo_debo'),
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
  }
})
