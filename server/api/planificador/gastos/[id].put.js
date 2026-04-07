import { db } from '../../../utils/db.js'
import { gastosPlanificados, planesMensuales, categorias } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import {
  replicarGastoRecurrente,
  actualizarRecurrentesFuturos,
  eliminarRecurrentesFuturos,
  generarGrupoId
} from '../../../utils/recurrente.js'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  // Get current state before update
  const [gastoAnterior] = await db
    .select()
    .from(gastosPlanificados)
    .where(eq(gastosPlanificados.id, id))
    .limit(1)

  if (!gastoAnterior) {
    throw createError({ statusCode: 404, message: 'Gasto planificado no encontrado' })
  }

  const eraRecurrente = gastoAnterior.esRecurrente
  const seraRecurrente = body.esRecurrente !== undefined ? body.esRecurrente : eraRecurrente
  const grupoAnterior = gastoAnterior.recurrenteGrupoId

  // Build update data
  const updateData = { updatedAt: new Date() }
  if (body.concepto !== undefined) updateData.concepto = body.concepto
  if (body.montoEstimado !== undefined) updateData.montoEstimado = String(body.montoEstimado)
  if (body.categoriaId !== undefined) updateData.categoriaId = body.categoriaId
  if (body.fechaProbablePago !== undefined) updateData.fechaProbablePago = body.fechaProbablePago
  if (body.esRecurrente !== undefined) updateData.esRecurrente = body.esRecurrente
  if (body.estado !== undefined) updateData.estado = body.estado
  if (body.notas !== undefined) updateData.notas = body.notas

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

    return await respuestaConCategoria(updated)

  } else {
    // Not recurring, simple update
    const [updated] = await db
      .update(gastosPlanificados)
      .set(updateData)
      .where(eq(gastosPlanificados.id, id))
      .returning()

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
