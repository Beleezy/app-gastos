import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { totalIngresosMes } from '../../services/ingresos.service.js'
import { db } from '../../utils/db.js'
import { gastos } from '../../database/schema.js'
import { eq, and, isNull, between, sql } from 'drizzle-orm'

// Devuelve totalIngresos, totalGastos, saldoNeto y % de ahorro del mes.
// Vista de "flujo neto" — núcleo del dashboard cuando ingresos está activo.
export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const q = getQuery(event)
  const mes = Number(q.mes) || new Date().getMonth() + 1
  const anio = Number(q.anio) || new Date().getFullYear()

  setHeader(event, 'Cache-Control', 'private, max-age=30, stale-while-revalidate=120')

  const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`
  const ultimoDiaNum = new Date(Number(anio), Number(mes), 0).getDate()
  const ultimaFecha = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`

  const [totalIngresos, gastosRow] = await Promise.all([
    totalIngresosMes({ usuarioId, mes, anio }),
    db
      .select({ total: sql`COALESCE(SUM(${gastos.monto}), 0)` })
      .from(gastos)
      .where(
        and(
          eq(gastos.usuarioId, usuarioId),
          isNull(gastos.deletedAt),
          between(gastos.fecha, primerDia, ultimaFecha),
        ),
      )
      .then((r) => r[0]),
  ])

  const totalGastos = parseFloat(gastosRow?.total || 0)
  const saldoNeto = Math.round((totalIngresos - totalGastos) * 100) / 100
  const porcentajeAhorro =
    totalIngresos > 0 ? Math.round((saldoNeto / totalIngresos) * 1000) / 10 : 0

  return {
    totalIngresos: Math.round(totalIngresos * 100) / 100,
    totalGastos: Math.round(totalGastos * 100) / 100,
    saldoNeto,
    porcentajeAhorro,
    mes,
    anio,
  }
})
