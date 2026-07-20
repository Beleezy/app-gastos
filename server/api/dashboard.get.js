// Endpoint consolidado para el home (pages/index.vue).
//
// Antes el dashboard hacía 5 requests separados:
//   /api/gastos/resumen, /api/deudas/resumen, /api/planificador,
//   /api/ahorros, /api/ingresos/resumen
// que en cold start (PWA Android + 4G) podían tardar 1.5–3s combinados
// porque cada request hace handshake + cookie auth + RTT a Supabase.
//
// Aquí ejecutamos todas las queries en paralelo dentro de UN solo handler.
// El cliente recibe una respuesta ya combinada y el navegador hace 1 RTT
// en lugar de 5. La query a Supabase usa el mismo pool de conexiones, así
// que el coste total en BD es similar (y a veces menor, porque el pool
// reaprovecha conexiones).

import { db } from '../utils/db.js'
import {
  gastos,
  deudas,
  planesMensuales,
  gastosPlanificados,
  categorias,
  configuraciones,
  ahorros,
  mediosAhorro,
} from '../database/schema.js'
import { getUsuarioFromEvent } from '../utils/getUsuario.js'
import { getFechaHoraLocalUsuario } from '../utils/fechaLocal.js'
import { fetchFuturePortfolio } from '../utils/gastosFuturos.js'
import { totalIngresosMes } from '../services/ingresos.service.js'
import { eq, and, between, sql, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const { fecha: hoy } = await getFechaHoraLocalUsuario(usuarioId)
  const [anio, mes] = hoy.split('-').map(Number)

  // SWR corto: el dashboard cambia con cada operación, 30s es un compromiso
  // razonable entre frescura y permitir cache por navegación rápida + SW.
  setHeader(event, 'Cache-Control', 'private, max-age=30, stale-while-revalidate=180')

  const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`
  const ultimoDiaNum = new Date(anio, mes, 0).getDate()
  const ultimaFecha = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`

  // Disparar TODO en paralelo.
  const [
    gastosResumenRow,
    deudasResumenRow,
    planRow,
    configRow,
    plannedGastosRows,
    portfolio,
    ahorrosMesRow,
    ahorrosGlobalRow,
    ahorrosPorMedioRaw,
    ingresosTotal,
  ] = await Promise.all([
    db
      .select({
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
      .then((r) => r[0]),

    db
      .select({
        totalMeDeben: sql`COALESCE(SUM(CASE WHEN ${deudas.tipoDeuda} = 'me_deben' AND ${deudas.estado} IN ('pendiente','parcial') THEN CAST(${deudas.montoPendiente} AS NUMERIC) ELSE 0 END), 0)`,
        totalYoDebo: sql`COALESCE(SUM(CASE WHEN ${deudas.tipoDeuda} = 'yo_debo' AND ${deudas.estado} IN ('pendiente','parcial') THEN CAST(${deudas.montoPendiente} AS NUMERIC) ELSE 0 END), 0)`,
        countMeDeben: sql`COUNT(CASE WHEN ${deudas.tipoDeuda} = 'me_deben' AND ${deudas.estado} IN ('pendiente','parcial') THEN 1 END)`,
        countYoDebo: sql`COUNT(CASE WHEN ${deudas.tipoDeuda} = 'yo_debo' AND ${deudas.estado} IN ('pendiente','parcial') THEN 1 END)`,
        countVencidasMeDeben: sql`COUNT(CASE WHEN ${deudas.tipoDeuda} = 'me_deben' AND ${deudas.estado} IN ('pendiente','parcial') AND ${deudas.fechaPago} IS NOT NULL AND ${deudas.fechaPago} < ${hoy} THEN 1 END)`,
      })
      .from(deudas)
      .where(and(eq(deudas.usuarioId, usuarioId), isNull(deudas.deletedAt)))
      .then((r) => r[0]),

    db
      .select()
      .from(planesMensuales)
      .where(
        and(
          eq(planesMensuales.usuarioId, usuarioId),
          eq(planesMensuales.mes, mes),
          eq(planesMensuales.anio, anio),
        ),
      )
      .limit(1)
      .then((r) => r[0] || null),

    db
      .select({
        presupuestoMensualDefault: configuraciones.presupuestoMensualDefault,
        monedaPreferida: configuraciones.monedaPreferida,
      })
      .from(configuraciones)
      .where(eq(configuraciones.usuarioId, usuarioId))
      .limit(1)
      .then((r) => r[0] || null),

    db
      .select({
        id: gastosPlanificados.id,
        estado: gastosPlanificados.estado,
        montoEstimado: gastosPlanificados.montoEstimado,
        categoriaId: gastosPlanificados.categoriaId,
        categoriaNombre: categorias.nombre,
        categoriaColor: categorias.color,
      })
      .from(gastosPlanificados)
      .leftJoin(categorias, eq(gastosPlanificados.categoriaId, categorias.id))
      .innerJoin(planesMensuales, eq(gastosPlanificados.planMensualId, planesMensuales.id))
      .where(
        and(
          eq(planesMensuales.usuarioId, usuarioId),
          eq(planesMensuales.mes, mes),
          eq(planesMensuales.anio, anio),
        ),
      ),

    fetchFuturePortfolio(db, usuarioId).catch(() => ({ resumenFuturos: {} })),

    db
      .select({ total: sql`COALESCE(SUM(${ahorros.monto}), 0)` })
      .from(ahorros)
      .where(and(eq(ahorros.usuarioId, usuarioId), eq(ahorros.mes, mes), eq(ahorros.anio, anio)))
      .then((r) => r[0]),

    db
      .select({ total: sql`COALESCE(SUM(${ahorros.monto}), 0)` })
      .from(ahorros)
      .where(eq(ahorros.usuarioId, usuarioId))
      .then((r) => r[0]),

    db
      .select({
        medioAhorroId: ahorros.medioAhorroId,
        medioNombre: mediosAhorro.nombre,
        medioIcono: mediosAhorro.icono,
        total: sql`COALESCE(SUM(${ahorros.monto}), 0)`,
      })
      .from(ahorros)
      .leftJoin(mediosAhorro, eq(ahorros.medioAhorroId, mediosAhorro.id))
      .where(and(eq(ahorros.usuarioId, usuarioId), eq(ahorros.mes, mes), eq(ahorros.anio, anio)))
      .groupBy(ahorros.medioAhorroId, mediosAhorro.nombre, mediosAhorro.icono),

    totalIngresosMes({ usuarioId, mes, anio }).catch(() => 0),
  ])

  const totalMes = parseFloat(gastosResumenRow?.totalMes || 0)
  const totalMeDeben = parseFloat(deudasResumenRow?.totalMeDeben || 0)
  const totalYoDebo = parseFloat(deudasResumenRow?.totalYoDebo || 0)

  const presupuesto =
    parseFloat(planRow?.montoPresupuesto ?? configRow?.presupuestoMensualDefault ?? 0) || 0

  const countTotal = plannedGastosRows.length
  const countPagados = plannedGastosRows.filter((g) => g.estado === 'pagado').length

  const ahorrosTotalMes = parseFloat(ahorrosMesRow?.total || 0)
  const ahorrosTotalGlobal = parseFloat(ahorrosGlobalRow?.total || 0)
  const ahorrosPorMedio = (ahorrosPorMedioRaw || [])
    .map((m) => ({
      medioAhorroId: m.medioAhorroId,
      medioNombre: m.medioNombre,
      medioIcono: m.medioIcono,
      total: parseFloat(m.total || 0),
    }))
    .filter((m) => m.total > 0)

  const totalIngresos = Number(ingresosTotal) || 0
  const saldoNeto = Math.round((totalIngresos - totalMes) * 100) / 100

  return {
    mes,
    anio,
    moneda: configRow?.monedaPreferida || 'PEN',
    gastos: {
      totalMes,
    },
    deudas: {
      totalMeDeben,
      totalYoDebo,
      balanceNeto: totalMeDeben - totalYoDebo,
      countMeDeben: Number(deudasResumenRow?.countMeDeben || 0),
      countYoDebo: Number(deudasResumenRow?.countYoDebo || 0),
      countVencidasMeDeben: Number(deudasResumenRow?.countVencidasMeDeben || 0),
    },
    plan: {
      presupuesto,
      countTotal,
      countPagados,
      porcentajePagado: countTotal > 0 ? (countPagados / countTotal) * 100 : 0,
    },
    futuros: portfolio?.resumenFuturos || {
      totalProyectos: 0,
      totalPromedio: 0,
      totalMinimo: 0,
      totalMaximo: 0,
      destacados: [],
    },
    ahorros: {
      totalMes: ahorrosTotalMes,
      totalGlobal: ahorrosTotalGlobal,
      porMedio: ahorrosPorMedio,
    },
    ingresos: {
      totalMes: totalIngresos,
      saldoNeto,
    },
  }
})
