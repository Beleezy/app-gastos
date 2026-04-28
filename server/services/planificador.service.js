// Capa de servicios del planificador. Ver §2.1 / §4.7 de planifica.md.

import { eq, and } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { gastosPlanificados, planesMensuales, categorias } from '../database/schema.js'
import { replicarGastoRecurrente, generarGrupoId } from '../utils/recurrente.js'

/**
 * Crea un gasto planificado dentro de un plan mensual del usuario.
 * Si el gasto es recurrente, replica en meses futuros usando el grupo
 * generado.
 *
 * @param {object} input
 * @param {string} input.usuarioId
 * @param {object} input.body
 */
export async function crearGastoPlanificado({ usuarioId, body }) {
  const [plan] = await db
    .select({ id: planesMensuales.id })
    .from(planesMensuales)
    .where(and(eq(planesMensuales.id, body.planMensualId), eq(planesMensuales.usuarioId, usuarioId)))
    .limit(1)

  if (!plan) {
    const err = new Error('Plan no encontrado')
    err.statusCode = 403
    throw err
  }

  const esRecurrente = !!body.esRecurrente
  const grupoId = esRecurrente ? generarGrupoId() : null

  const [gasto] = await db
    .insert(gastosPlanificados)
    .values({
      planMensualId: body.planMensualId,
      categoriaId: body.categoriaId,
      concepto: body.concepto,
      montoEstimado: String(body.montoEstimado),
      fechaProbablePago: body.fechaProbablePago,
      esRecurrente,
      recurrenteGrupoId: grupoId,
      notas: body.notas || null,
    })
    .returning()

  if (esRecurrente) {
    await replicarGastoRecurrente(
      usuarioId,
      {
        categoriaId: body.categoriaId,
        concepto: body.concepto,
        montoEstimado: body.montoEstimado,
        fechaProbablePago: body.fechaProbablePago,
        notas: body.notas || null,
      },
      grupoId,
    )
  }

  const [cat] = await db
    .select()
    .from(categorias)
    .where(eq(categorias.id, gasto.categoriaId))
    .limit(1)

  return {
    ...gasto,
    montoEstimado: parseFloat(gasto.montoEstimado),
    categoriaNombre: cat?.nombre,
    categoriaIcono: cat?.icono,
    categoriaColor: cat?.color,
  }
}
