import { db } from '../../utils/db.js'
import { gastos } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, between, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const usuarioId = await getUsuarioFromEvent(event)
  const { fecha, mes, anio } = query

  // Total del día
  let totalDia = 0
  if (fecha) {
    const [result] = await db
      .select({ total: sql`COALESCE(SUM(${gastos.monto}), 0)` })
      .from(gastos)
      .where(and(eq(gastos.usuarioId, usuarioId), eq(gastos.fecha, fecha)))
    totalDia = parseFloat(result.total)
  }

  // Total del mes
  let totalMes = 0
  if (mes && anio) {
    const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`
    const ultimoDia = new Date(Number(anio), Number(mes), 0).getDate()
    const ultimaFecha = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
    const [result] = await db
      .select({ total: sql`COALESCE(SUM(${gastos.monto}), 0)` })
      .from(gastos)
      .where(and(eq(gastos.usuarioId, usuarioId), between(gastos.fecha, primerDia, ultimaFecha)))
    totalMes = parseFloat(result.total)
  }

  return { totalDia, totalMes }
})
