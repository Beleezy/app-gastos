import { db } from '../../utils/db.js'
import { planesMensuales, gastosPlanificados, categorias, configuraciones, gastos } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { fetchFuturePortfolio } from '../../utils/gastosFuturos.js'
import { eq, and, between, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const mes = parseInt(query.mes) || (new Date().getMonth() + 1)
  const anio = parseInt(query.anio) || new Date().getFullYear()
  const usuarioId = await getUsuarioFromEvent(event)

  // Find existing plan
  let [plan] = await db
    .select()
    .from(planesMensuales)
    .where(and(
      eq(planesMensuales.usuarioId, usuarioId),
      eq(planesMensuales.mes, mes),
      eq(planesMensuales.anio, anio)
    ))
    .limit(1)

  // Auto-create plan if not found
  if (!plan) {
    const [config] = await db
      .select()
      .from(configuraciones)
      .where(eq(configuraciones.usuarioId, usuarioId))
      .limit(1)

    const presupuesto = config?.presupuestoMensualDefault || '0'

    try {
      const [newPlan] = await db
        .insert(planesMensuales)
        .values({ usuarioId, mes, anio, montoPresupuesto: presupuesto })
        .returning()

      if (newPlan) plan = newPlan
    } catch {
      // Unique constraint violation - created concurrently
    }

    if (!plan) {
      [plan] = await db
        .select()
        .from(planesMensuales)
        .where(and(
          eq(planesMensuales.usuarioId, usuarioId),
          eq(planesMensuales.mes, mes),
          eq(planesMensuales.anio, anio)
        ))
        .limit(1)
    }
  }

  // Fetch planned expenses with category data
  const gastosRaw = await db
    .select({
      id: gastosPlanificados.id,
      planMensualId: gastosPlanificados.planMensualId,
      categoriaId: gastosPlanificados.categoriaId,
      concepto: gastosPlanificados.concepto,
      montoEstimado: gastosPlanificados.montoEstimado,
      fechaProbablePago: gastosPlanificados.fechaProbablePago,
      esRecurrente: gastosPlanificados.esRecurrente,
      recurrenteGrupoId: gastosPlanificados.recurrenteGrupoId,
      estado: gastosPlanificados.estado,
      notas: gastosPlanificados.notas,
      createdAt: gastosPlanificados.createdAt,
      categoriaNombre: categorias.nombre,
      categoriaIcono: categorias.icono,
      categoriaColor: categorias.color,
      gastoRegistradoId: gastos.id,
      gastoRegistradoFecha: gastos.fecha,
      gastoRegistradoHora: gastos.hora,
      gastoRegistradoNotas: gastos.notas,
    })
    .from(gastosPlanificados)
    .leftJoin(categorias, eq(gastosPlanificados.categoriaId, categorias.id))
    .leftJoin(gastos, and(
      eq(gastos.gastoPlanificadoId, gastosPlanificados.id),
      eq(gastos.usuarioId, usuarioId),
    ))
    .where(eq(gastosPlanificados.planMensualId, plan.id))
    .orderBy(gastosPlanificados.fechaProbablePago)

  // Fetch real expenses for this month grouped by category
  const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = `${anio}-${String(mes).padStart(2, '0')}-${new Date(anio, mes, 0).getDate()}`

  const gastosRealesRaw = await db
    .select({
      categoriaId: gastos.categoriaId,
      totalReal: sql`COALESCE(SUM(${gastos.monto}), 0)`.as('totalReal'),
    })
    .from(gastos)
    .where(and(
      eq(gastos.usuarioId, usuarioId),
      between(gastos.fecha, primerDia, ultimoDia),
    ))
    .groupBy(gastos.categoriaId)

  const gastosRealesPorCategoria = {}
  for (const g of gastosRealesRaw) {
    gastosRealesPorCategoria[g.categoriaId] = parseFloat(g.totalReal)
  }

  const { gastosFuturos, resumenFuturos } = await fetchFuturePortfolio(db, usuarioId)

  return {
    plan: {
      ...plan,
      montoPresupuesto: parseFloat(plan.montoPresupuesto),
    },
    gastos: gastosRaw.map(g => ({
      ...g,
      estado: g.gastoRegistradoId ? 'pagado' : g.estado,
      montoEstimado: parseFloat(g.montoEstimado),
    })),
    gastosRealesPorCategoria,
    gastosFuturos,
    resumenFuturos,
  }
})
