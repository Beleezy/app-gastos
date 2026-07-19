import { db } from '../../utils/db.js'
import { gastos } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, between, sql, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const usuarioId = await getUsuarioFromEvent(event)
  const { fecha, mes, anio } = query

  // Cache-Control: el resumen del día/mes cambia con cada gasto, pero un
  // valor cacheado de hasta 30s es aceptable y reduce carga en
  // navegaciones rápidas. SW (workbox NetworkFirst) lo aprovecha también.
  setHeader(event, 'Cache-Control', 'private, max-age=30, stale-while-revalidate=120')

  // Si hay mes/anio calculamos totalDia + totalMes en UNA sola query con
  // CASE WHEN para evitar dos round-trips. La fecha del día se inyecta
  // como literal SQL para que el CASE pueda compararla.
  if (mes && anio) {
    const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`
    const ultimoDia = new Date(Number(anio), Number(mes), 0).getDate()
    const ultimaFecha = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

    const totalDiaExpr = fecha
      ? sql`COALESCE(SUM(CASE WHEN ${gastos.fecha} = ${fecha} THEN ${gastos.monto} END), 0)`
      : sql`0`

    const [row] = await db
      .select({
        totalDia: totalDiaExpr,
        totalMes: sql`COALESCE(SUM(${gastos.monto}), 0)`,
      })
      .from(gastos)
      .where(
        and(
          eq(gastos.usuarioId, usuarioId),
          isNull(gastos.deletedAt),
          between(gastos.fecha, primerDia, ultimaFecha),
        ),
      )

    return {
      totalDia: parseFloat(row.totalDia),
      totalMes: parseFloat(row.totalMes),
    }
  }

  // Fallback: solo total del día.
  if (fecha) {
    const [row] = await db
      .select({ total: sql`COALESCE(SUM(${gastos.monto}), 0)` })
      .from(gastos)
      .where(
        and(eq(gastos.usuarioId, usuarioId), isNull(gastos.deletedAt), eq(gastos.fecha, fecha)),
      )
    return { totalDia: parseFloat(row.total), totalMes: 0 }
  }

  return { totalDia: 0, totalMes: 0 }
})
