import { db } from './db.js'
import { planesMensuales, gastosPlanificados, configuraciones, gastos } from '../database/schema.js'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'

const MESES_FUTUROS = 12

/**
 * Gets or creates a monthly plan for a given user/month/year.
 * Accepts an optional `dbClient` (e.g. a transaction handle) for callers
 * that need all reads/writes to participate in the same transaction.
 */
export async function obtenerOCrearPlan(usuarioId, mes, anio, dbClient = db) {
  // Always try to find first
  const buscar = () =>
    dbClient
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

  let [plan] = await buscar()
  if (plan) return plan

  // Get default budget
  const [config] = await dbClient
    .select()
    .from(configuraciones)
    .where(eq(configuraciones.usuarioId, usuarioId))
    .limit(1)

  const presupuesto = config?.presupuestoMensualDefault || '0'

  // Try to insert, catch unique constraint violation
  try {
    const [newPlan] = await dbClient
      .insert(planesMensuales)
      .values({ usuarioId, mes, anio, montoPresupuesto: presupuesto })
      .returning()

    if (newPlan) return newPlan
  } catch {
    // Unique constraint violation - plan was created concurrently
  }

  // Fallback: re-fetch the existing plan
  const [existing] = await buscar()
  return existing
}

/**
 * Calculates the list of future months from a given starting month/year
 */
function mesesFuturos(mesInicio, anioInicio, cantidad = MESES_FUTUROS) {
  const resultado = []
  let mes = mesInicio
  let anio = anioInicio

  for (let i = 0; i < cantidad; i++) {
    mes++
    if (mes > 12) {
      mes = 1
      anio++
    }
    resultado.push({ mes, anio })
  }
  return resultado
}

/**
 * Adjusts a day to be valid for a given month/year
 * e.g., day 31 in February becomes 28/29
 */
function ajustarDia(dia, mes, anio) {
  const ultimoDia = new Date(anio, mes, 0).getDate()
  return Math.min(dia, ultimoDia)
}

/**
 * Replicates a recurring expense to future months.
 * Called after creating a new recurring expense.
 */
export async function replicarGastoRecurrente(usuarioId, gasto, grupoId) {
  const fechaOrigen = new Date(gasto.fechaProbablePago + 'T00:00:00')
  const diaOriginal = fechaOrigen.getDate()
  const mesOrigen = fechaOrigen.getMonth() + 1
  const anioOrigen = fechaOrigen.getFullYear()

  const futuros = mesesFuturos(mesOrigen, anioOrigen)

  for (const { mes, anio } of futuros) {
    const plan = await obtenerOCrearPlan(usuarioId, mes, anio)
    if (!plan?.id) continue

    const diaAjustado = ajustarDia(diaOriginal, mes, anio)
    const fecha = `${anio}-${String(mes).padStart(2, '0')}-${String(diaAjustado).padStart(2, '0')}`

    await db.insert(gastosPlanificados).values({
      planMensualId: plan.id,
      categoriaId: gasto.categoriaId,
      concepto: gasto.concepto,
      montoEstimado: String(gasto.montoEstimado),
      fechaProbablePago: fecha,
      esRecurrente: true,
      recurrenteGrupoId: grupoId,
      notas: gasto.notas || null,
    })
  }
}

/**
 * Updates all future recurring expenses in the same group.
 * Only updates months that are >= the current month.
 */
export async function actualizarRecurrentesFuturos(grupoId, gastoActualId, datos) {
  // Get all expenses in this group except the one being edited
  const todos = await db
    .select({
      id: gastosPlanificados.id,
      planMensualId: gastosPlanificados.planMensualId,
      fechaProbablePago: gastosPlanificados.fechaProbablePago,
      estado: gastosPlanificados.estado,
    })
    .from(gastosPlanificados)
    .where(eq(gastosPlanificados.recurrenteGrupoId, grupoId))

  const hoy = new Date()
  const mesActual = hoy.getMonth() + 1
  const anioActual = hoy.getFullYear()

  for (const gp of todos) {
    if (gp.id === gastoActualId) continue

    // Only update future months (don't touch past months)
    const fechaGp = new Date(gp.fechaProbablePago + 'T00:00:00')
    const mesGp = fechaGp.getMonth() + 1
    const anioGp = fechaGp.getFullYear()

    if (anioGp < anioActual || (anioGp === anioActual && mesGp < mesActual)) continue

    // Only update pagado -> pendiente not needed; keep estado of future ones
    const updateData = { updatedAt: new Date() }
    if (datos.concepto !== undefined) updateData.concepto = datos.concepto
    if (datos.montoEstimado !== undefined) updateData.montoEstimado = String(datos.montoEstimado)
    if (datos.categoriaId !== undefined) updateData.categoriaId = datos.categoriaId
    if (datos.notas !== undefined) updateData.notas = datos.notas

    // Adjust the day for this month if fecha changed
    if (datos.fechaProbablePago !== undefined) {
      const nuevaFecha = new Date(datos.fechaProbablePago + 'T00:00:00')
      const diaOriginal = nuevaFecha.getDate()
      const diaAjustado = ajustarDia(diaOriginal, mesGp, anioGp)
      updateData.fechaProbablePago = `${anioGp}-${String(mesGp).padStart(2, '0')}-${String(diaAjustado).padStart(2, '0')}`
    }

    await db.update(gastosPlanificados).set(updateData).where(eq(gastosPlanificados.id, gp.id))
  }
}

/**
 * Deletes all future recurring expenses in the same group.
 */
export async function eliminarRecurrentesFuturos(grupoId, gastoActualId) {
  const todos = await db
    .select({
      id: gastosPlanificados.id,
      fechaProbablePago: gastosPlanificados.fechaProbablePago,
    })
    .from(gastosPlanificados)
    .where(eq(gastosPlanificados.recurrenteGrupoId, grupoId))

  const hoy = new Date()
  const mesActual = hoy.getMonth() + 1
  const anioActual = hoy.getFullYear()

  for (const gp of todos) {
    if (gp.id === gastoActualId) continue

    const fechaGp = new Date(gp.fechaProbablePago + 'T00:00:00')
    const mesGp = fechaGp.getMonth() + 1
    const anioGp = fechaGp.getFullYear()

    // Only delete future months
    if (anioGp < anioActual || (anioGp === anioActual && mesGp < mesActual)) continue

    // Delete associated real expense if exists
    await db.delete(gastos).where(eq(gastos.gastoPlanificadoId, gp.id))

    await db.delete(gastosPlanificados).where(eq(gastosPlanificados.id, gp.id))
  }
}

/**
 * Generates a new UUID for grouping recurring expenses
 */
export function generarGrupoId() {
  return crypto.randomUUID()
}
