import { db } from '../../utils/db.js'
import {
  planesMensuales,
  gastosPlanificados,
  categorias,
  configuraciones,
  gastos,
} from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { getFechaHoraLocalUsuario } from '../../utils/fechaLocal.js'
import { eq, and, between, sql, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const usuarioId = await getUsuarioFromEvent(event)
  const { fecha: fechaLocal } = await getFechaHoraLocalUsuario(usuarioId)
  const [anioLocal, mesLocal] = fechaLocal.split('-').map(Number)
  const mes = parseInt(query.mes) || mesLocal
  const anio = parseInt(query.anio) || anioLocal

  // Buscar plan y config en paralelo (independientes hasta el insert).
  let [planRows, configRows] = await Promise.all([
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
      .limit(1),
    db
      .select({ presupuestoMensualDefault: configuraciones.presupuestoMensualDefault })
      .from(configuraciones)
      .where(eq(configuraciones.usuarioId, usuarioId))
      .limit(1),
  ])
  let plan = planRows[0]

  // Auto-create plan if not found
  if (!plan) {
    const presupuesto = configRows[0]?.presupuestoMensualDefault || '0'
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
      ;[plan] = await db
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
    }
  }

  // Ya con plan resuelto, las siguientes 3 lecturas son independientes.
  const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`
  const ultimoDia = `${anio}-${String(mes).padStart(2, '0')}-${new Date(anio, mes, 0).getDate()}`

  const [gastosRaw, gastosRealesRaw] = await Promise.all([
    db
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
      .leftJoin(
        gastos,
        and(
          eq(gastos.gastoPlanificadoId, gastosPlanificados.id),
          eq(gastos.usuarioId, usuarioId),
          isNull(gastos.deletedAt),
        ),
      )
      .where(eq(gastosPlanificados.planMensualId, plan.id))
      .orderBy(gastosPlanificados.fechaProbablePago),

    db
      .select({
        categoriaId: gastos.categoriaId,
        totalReal: sql`COALESCE(SUM(${gastos.monto}), 0)`.as('totalReal'),
      })
      .from(gastos)
      .where(
        and(
          eq(gastos.usuarioId, usuarioId),
          between(gastos.fecha, primerDia, ultimoDia),
          isNull(gastos.deletedAt),
        ),
      )
      .groupBy(gastos.categoriaId),
  ])

  const gastosRealesPorCategoria = {}
  for (const g of gastosRealesRaw) {
    gastosRealesPorCategoria[g.categoriaId] = parseFloat(g.totalReal)
  }

  // NOTA: antes esta respuesta embebía el portfolio completo de gastos
  // futuros (fetchFuturePortfolio), con imágenes base64 de las opciones
  // incluidas (~10+ KB extra por carga). Ningún consumidor lo leía de aquí:
  // useGastosFuturos pide /api/futuros por su cuenta (P2 ronda 2).
  return {
    plan: {
      ...plan,
      montoPresupuesto: parseFloat(plan.montoPresupuesto),
    },
    gastos: gastosRaw.map((g) => ({
      ...g,
      estado: g.gastoRegistradoId ? 'pagado' : g.estado,
      montoEstimado: parseFloat(g.montoEstimado),
    })),
    gastosRealesPorCategoria,
  }
})
