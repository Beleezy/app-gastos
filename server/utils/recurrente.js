import { db } from './db.js'
import { planesMensuales, gastosPlanificados, configuraciones, gastos } from '../database/schema.js'
import { eq, and, or, inArray } from 'drizzle-orm'
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
 * Calcula a qué meses se proyecta un gasto recurrente y con qué fecha en
 * cada uno, ajustando el día a la longitud del mes.
 *
 * Parte pura extraída del bucle: permite resolver los 12 meses de una vez
 * en lugar de ir mes a mes contra la BD.
 *
 * @returns {Array<{mes: number, anio: number, fecha: string}>}
 */
export function planificarMesesRecurrentes({
  mesOrigen,
  anioOrigen,
  diaOriginal,
  cantidad = MESES_FUTUROS,
}) {
  return mesesFuturos(mesOrigen, anioOrigen, cantidad).map(({ mes, anio }) => {
    const dia = ajustarDia(diaOriginal, mes, anio)
    return {
      mes,
      anio,
      fecha: `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
    }
  })
}

/**
 * Replicates a recurring expense to future months.
 * Called after creating a new recurring expense.
 *
 * Antes esto era un bucle de 12 iteraciones y cada una hacía su propio
 * SELECT del plan mensual, su posible INSERT del plan y el INSERT del
 * gasto: hasta ~36 round trips secuenciales contra Supabase (≈1-2 s en
 * una función serverless) para crear UN gasto recurrente. Y todo fuera de
 * transacción, así que un fallo en el mes 7 dejaba 6 meses replicados,
 * sin error que los limpiara ni forma de distinguirlo de un recurrente
 * que el usuario acortó a mano.
 *
 * Ahora son 3 queries dentro de una transacción: los planes existentes de
 * los 12 meses en una, los que faltan en un INSERT múltiple, y los 12
 * gastos planificados en otro.
 */
export async function replicarGastoRecurrente(usuarioId, gasto, grupoId) {
  const fechaOrigen = new Date(gasto.fechaProbablePago + 'T00:00:00')
  const objetivos = planificarMesesRecurrentes({
    mesOrigen: fechaOrigen.getMonth() + 1,
    anioOrigen: fechaOrigen.getFullYear(),
    diaOriginal: fechaOrigen.getDate(),
  })

  await db.transaction(async (tx) => {
    const [config] = await tx
      .select({ presupuesto: configuraciones.presupuestoMensualDefault })
      .from(configuraciones)
      .where(eq(configuraciones.usuarioId, usuarioId))
      .limit(1)
    const presupuesto = config?.presupuesto || '0'

    // Los planes de los 12 meses de una sola vez.
    const clave = (mes, anio) => `${anio}-${mes}`
    const existentes = await tx
      .select({
        id: planesMensuales.id,
        mes: planesMensuales.mes,
        anio: planesMensuales.anio,
      })
      .from(planesMensuales)
      .where(
        and(
          eq(planesMensuales.usuarioId, usuarioId),
          or(...objetivos.map((o) => and(eq(planesMensuales.mes, o.mes), eq(planesMensuales.anio, o.anio)))),
        ),
      )

    const planPorMes = new Map(existentes.map((p) => [clave(p.mes, p.anio), p.id]))

    const faltantes = objetivos.filter((o) => !planPorMes.has(clave(o.mes, o.anio)))
    if (faltantes.length > 0) {
      // onConflictDoNothing + returning: si otra petición creó el plan
      // entremedias, el UNIQUE (usuario, mes, año) lo absorbe y la fila
      // simplemente no vuelve — se resuelve en el re-select de abajo.
      const creados = await tx
        .insert(planesMensuales)
        .values(
          faltantes.map((o) => ({
            usuarioId,
            mes: o.mes,
            anio: o.anio,
            montoPresupuesto: presupuesto,
          })),
        )
        .onConflictDoNothing()
        .returning({ id: planesMensuales.id, mes: planesMensuales.mes, anio: planesMensuales.anio })

      for (const p of creados) planPorMes.set(clave(p.mes, p.anio), p.id)

      // Los que el conflicto absorbió: relectura de los que sigan sin id.
      const sinResolver = objetivos.filter((o) => !planPorMes.has(clave(o.mes, o.anio)))
      if (sinResolver.length > 0) {
        const recuperados = await tx
          .select({
            id: planesMensuales.id,
            mes: planesMensuales.mes,
            anio: planesMensuales.anio,
          })
          .from(planesMensuales)
          .where(
            and(
              eq(planesMensuales.usuarioId, usuarioId),
              or(
                ...sinResolver.map((o) =>
                  and(eq(planesMensuales.mes, o.mes), eq(planesMensuales.anio, o.anio)),
                ),
              ),
            ),
          )
        for (const p of recuperados) planPorMes.set(clave(p.mes, p.anio), p.id)
      }
    }

    const filas = objetivos
      .map((o) => ({ planMensualId: planPorMes.get(clave(o.mes, o.anio)), fecha: o.fecha }))
      .filter((f) => f.planMensualId)
      .map((f) => ({
        planMensualId: f.planMensualId,
        categoriaId: gasto.categoriaId,
        concepto: gasto.concepto,
        montoEstimado: String(gasto.montoEstimado),
        fechaProbablePago: f.fecha,
        esRecurrente: true,
        recurrenteGrupoId: grupoId,
        notas: gasto.notas || null,
      }))

    if (filas.length > 0) {
      await tx.insert(gastosPlanificados).values(filas)
    }
  })
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

  // Solo meses futuros: los pasados son historial y no se tocan.
  const futuros = todos.filter((gp) => {
    if (gp.id === gastoActualId) return false
    const fechaGp = new Date(gp.fechaProbablePago + 'T00:00:00')
    const mesGp = fechaGp.getMonth() + 1
    const anioGp = fechaGp.getFullYear()
    return !(anioGp < anioActual || (anioGp === anioActual && mesGp < mesActual))
  })

  if (futuros.length === 0) return

  const comunes = { updatedAt: new Date() }
  if (datos.concepto !== undefined) comunes.concepto = datos.concepto
  if (datos.montoEstimado !== undefined) comunes.montoEstimado = String(datos.montoEstimado)
  if (datos.categoriaId !== undefined) comunes.categoriaId = datos.categoriaId
  if (datos.notas !== undefined) comunes.notas = datos.notas

  await db.transaction(async (tx) => {
    // Los campos que no dependen del mes se aplican a todas las filas de
    // una vez, en lugar de un UPDATE por mes (12 round trips secuenciales
    // y sin transacción, así que un fallo a mitad dejaba meses con el
    // concepto nuevo y meses con el viejo).
    await tx
      .update(gastosPlanificados)
      .set(comunes)
      .where(
        inArray(
          gastosPlanificados.id,
          futuros.map((gp) => gp.id),
        ),
      )

    // La fecha sí depende del mes: el día se recorta a la longitud de cada
    // uno (un recurrente el 31 cae al 28 en febrero). Se agrupan los ids
    // que comparten fecha resultante para no volver a una query por fila.
    if (datos.fechaProbablePago !== undefined) {
      const diaOriginal = new Date(datos.fechaProbablePago + 'T00:00:00').getDate()
      const porFecha = new Map()
      for (const gp of futuros) {
        const fechaGp = new Date(gp.fechaProbablePago + 'T00:00:00')
        const mesGp = fechaGp.getMonth() + 1
        const anioGp = fechaGp.getFullYear()
        const dia = ajustarDia(diaOriginal, mesGp, anioGp)
        const fecha = `${anioGp}-${String(mesGp).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
        if (!porFecha.has(fecha)) porFecha.set(fecha, [])
        porFecha.get(fecha).push(gp.id)
      }
      for (const [fecha, ids] of porFecha) {
        await tx
          .update(gastosPlanificados)
          .set({ fechaProbablePago: fecha })
          .where(inArray(gastosPlanificados.id, ids))
      }
    }
  })
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

  const aBorrar = todos
    .filter((gp) => {
      if (gp.id === gastoActualId) return false
      const fechaGp = new Date(gp.fechaProbablePago + 'T00:00:00')
      const mesGp = fechaGp.getMonth() + 1
      const anioGp = fechaGp.getFullYear()
      // Solo meses futuros: los pasados son historial.
      return !(anioGp < anioActual || (anioGp === anioActual && mesGp < mesActual))
    })
    .map((gp) => gp.id)

  if (aBorrar.length === 0) return

  // Antes eran 2 DELETE por mes, secuenciales y sin transacción: borrar un
  // recurrente de 12 meses hacía 24 round trips, y un fallo a mitad dejaba
  // meses borrados y meses no.
  await db.transaction(async (tx) => {
    await tx.delete(gastos).where(inArray(gastos.gastoPlanificadoId, aBorrar))
    await tx.delete(gastosPlanificados).where(inArray(gastosPlanificados.id, aBorrar))
  })
}

/**
 * Generates a new UUID for grouping recurring expenses
 */
export function generarGrupoId() {
  return crypto.randomUUID()
}
