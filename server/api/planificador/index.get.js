import { db } from '../../utils/db.js'
import { planesMensuales, gastosPlanificados, categorias, configuraciones } from '../../database/schema.js'
import { getUsuarioId } from '../../utils/getUsuario.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const mes = parseInt(query.mes) || (new Date().getMonth() + 1)
  const anio = parseInt(query.anio) || new Date().getFullYear()
  const usuarioId = await getUsuarioId()

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
    // Get default budget from configuraciones
    const [config] = await db
      .select()
      .from(configuraciones)
      .where(eq(configuraciones.usuarioId, usuarioId))
      .limit(1)

    const presupuesto = config?.presupuestoMensualDefault || '0'

    const [newPlan] = await db
      .insert(planesMensuales)
      .values({ usuarioId, mes, anio, montoPresupuesto: presupuesto })
      .onConflictDoNothing()
      .returning()

    // Handle race condition: if another request already inserted, fetch it
    if (newPlan) {
      plan = newPlan
    } else {
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
      estado: gastosPlanificados.estado,
      notas: gastosPlanificados.notas,
      createdAt: gastosPlanificados.createdAt,
      categoriaNombre: categorias.nombre,
      categoriaIcono: categorias.icono,
      categoriaColor: categorias.color,
    })
    .from(gastosPlanificados)
    .leftJoin(categorias, eq(gastosPlanificados.categoriaId, categorias.id))
    .where(eq(gastosPlanificados.planMensualId, plan.id))
    .orderBy(gastosPlanificados.fechaProbablePago)

  return {
    plan: {
      ...plan,
      montoPresupuesto: parseFloat(plan.montoPresupuesto),
    },
    gastos: gastosRaw.map(g => ({
      ...g,
      montoEstimado: parseFloat(g.montoEstimado),
    })),
  }
})
