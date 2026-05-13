import { db } from '../../../utils/db.js'
import { gastosPlanificados, planesMensuales, categorias } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { validateBody } from '../../../utils/validate.js'
import { gastoPlanificadoUpdateSchema } from '~/shared/schemas/planificador.js'
import {
  replicarGastoRecurrente,
  actualizarRecurrentesFuturos,
  eliminarRecurrentesFuturos,
  generarGrupoId
} from '../../../utils/recurrente.js'
import { and, eq } from 'drizzle-orm'
import { syncUpdated } from '../../../utils/gcalAutoSync.js'

// gastosPlanificados no tiene columna usuarioId directa; el ownership se
// deriva de planMensualId → planesMensuales.usuarioId. Cargar con JOIN
// y devolver 404 si no pertenece al usuario evita IDOR (cambiar el UUID
// de la URL para editar/borrar gastos de otros).
async function cargarGastoPropio(id, usuarioId) {
  const [row] = await db
    .select({ gp: gastosPlanificados })
    .from(gastosPlanificados)
    .innerJoin(planesMensuales, eq(planesMensuales.id, gastosPlanificados.planMensualId))
    .where(and(
      eq(gastosPlanificados.id, id),
      eq(planesMensuales.usuarioId, usuarioId),
    ))
    .limit(1)
  return row?.gp || null
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  // Whitelist + tipos via Zod: `estado` queda restringido al enum real
  // (`pendiente | pagado`), monto debe ser finito y positivo, fecha
  // YYYY-MM-DD estricto. Bloquea mass-assignment de planMensualId o
  // googleEventId desde el body.
  const body = await validateBody(event, gastoPlanificadoUpdateSchema)

  // Get current state before update (con check de ownership)
  const gastoAnterior = await cargarGastoPropio(id, usuarioId)

  if (!gastoAnterior) {
    throw createError({ statusCode: 404, message: 'Gasto planificado no encontrado' })
  }

  const eraRecurrente = gastoAnterior.esRecurrente
  const seraRecurrente = body.esRecurrente !== undefined ? body.esRecurrente : eraRecurrente
  const grupoAnterior = gastoAnterior.recurrenteGrupoId
  // alcanceEdicion: 'solo' => aplicar solo a este registro (desvincula del grupo),
  //                 'futuros' (default) => propagar a este y los futuros del grupo
  const alcanceEdicion = body.alcanceEdicion === 'solo' ? 'solo' : 'futuros'

  // Build update data
  const updateData = { updatedAt: new Date() }
  if (body.concepto !== undefined) updateData.concepto = body.concepto
  if (body.montoEstimado !== undefined) updateData.montoEstimado = String(body.montoEstimado)
  if (body.categoriaId !== undefined) updateData.categoriaId = body.categoriaId
  if (body.fechaProbablePago !== undefined) updateData.fechaProbablePago = body.fechaProbablePago
  if (body.esRecurrente !== undefined) updateData.esRecurrente = body.esRecurrente
  if (body.estado !== undefined) updateData.estado = body.estado
  if (body.notas !== undefined) updateData.notas = body.notas
  // No persistimos alcanceEdicion en la DB
  delete updateData.alcanceEdicion

  // Caso especial: editar recurrente con alcance "solo este mes"
  // Desvincula del grupo sin tocar los demás meses del grupo.
  if (eraRecurrente && alcanceEdicion === 'solo') {
    updateData.recurrenteGrupoId = null
    updateData.esRecurrente = false

    const [updated] = await db
      .update(gastosPlanificados)
      .set(updateData)
      .where(eq(gastosPlanificados.id, id))
      .returning()

    syncUpdated(usuarioId, id)
    return await respuestaConCategoria(updated)
  }

  // Handle recurrence transitions
  if (!eraRecurrente && seraRecurrente) {
    // Turned ON: generate group and replicate forward
    const nuevoGrupoId = generarGrupoId()
    updateData.recurrenteGrupoId = nuevoGrupoId

    const [updated] = await db
      .update(gastosPlanificados)
      .set(updateData)
      .where(eq(gastosPlanificados.id, id))
      .returning()

    await replicarGastoRecurrente(usuarioId, {
      categoriaId: updated.categoriaId,
      concepto: updated.concepto,
      montoEstimado: parseFloat(updated.montoEstimado),
      fechaProbablePago: updated.fechaProbablePago,
      notas: updated.notas,
    }, nuevoGrupoId)

    syncUpdated(usuarioId, id)
    return await respuestaConCategoria(updated)

  } else if (eraRecurrente && !seraRecurrente) {
    // Turned OFF: remove future copies, clear group
    if (grupoAnterior) {
      await eliminarRecurrentesFuturos(grupoAnterior, id)
    }
    updateData.recurrenteGrupoId = null

    const [updated] = await db
      .update(gastosPlanificados)
      .set(updateData)
      .where(eq(gastosPlanificados.id, id))
      .returning()

    syncUpdated(usuarioId, id)
    return await respuestaConCategoria(updated)

  } else if (eraRecurrente && seraRecurrente && grupoAnterior) {
    // Was and still is recurring: propagate changes to future months
    const [updated] = await db
      .update(gastosPlanificados)
      .set(updateData)
      .where(eq(gastosPlanificados.id, id))
      .returning()

    // Only propagate data changes (not estado - each month has its own)
    const datosParaPropagar = {}
    if (body.concepto !== undefined) datosParaPropagar.concepto = body.concepto
    if (body.montoEstimado !== undefined) datosParaPropagar.montoEstimado = body.montoEstimado
    if (body.categoriaId !== undefined) datosParaPropagar.categoriaId = body.categoriaId
    if (body.fechaProbablePago !== undefined) datosParaPropagar.fechaProbablePago = body.fechaProbablePago
    if (body.notas !== undefined) datosParaPropagar.notas = body.notas

    if (Object.keys(datosParaPropagar).length > 0) {
      await actualizarRecurrentesFuturos(grupoAnterior, id, datosParaPropagar)
    }

    syncUpdated(usuarioId, id)
    return await respuestaConCategoria(updated)

  } else {
    // Not recurring, simple update
    const [updated] = await db
      .update(gastosPlanificados)
      .set(updateData)
      .where(eq(gastosPlanificados.id, id))
      .returning()

    syncUpdated(usuarioId, id)
    return await respuestaConCategoria(updated)
  }
})

async function respuestaConCategoria(gasto) {
  const [cat] = await db.select().from(categorias).where(eq(categorias.id, gasto.categoriaId)).limit(1)
  return {
    ...gasto,
    montoEstimado: parseFloat(gasto.montoEstimado),
    categoriaNombre: cat?.nombre,
    categoriaIcono: cat?.icono,
    categoriaColor: cat?.color,
  }
}
