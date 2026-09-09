// Capa de servicios del planificador. Ver §2.1 / §4.7 de planifica.md.

import { eq, and } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { gastosPlanificados, planesMensuales, categorias } from '../database/schema.js'
import { replicarGastoRecurrente, generarGrupoId } from '../utils/recurrente.js'
import { assertCategoriasPropias, categoriasLegibles } from '../utils/categorias.js'

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
    .where(
      and(eq(planesMensuales.id, body.planMensualId), eq(planesMensuales.usuarioId, usuarioId)),
    )
    .limit(1)

  if (!plan) {
    const err = new Error('Plan no encontrado')
    err.statusCode = 403
    throw err
  }

  // Mismo agujero que tenía POST /api/gastos antes de la ronda 1, y con la
  // misma consecuencia: `categoriaId` entraba sin comprobar de quién era y
  // la respuesta hace un join para devolver `categoriaNombre`. Mandando el
  // id de una categoría privada ajena, el planificador devolvía su nombre
  // —"Terapia psiquiátrica", "Abogado divorcio"—. En una app de finanzas el
  // nombre de una categoría privada es justo lo que no debe cruzar cuentas.
  await assertCategoriasPropias({ usuarioId, categoriaIds: [body.categoriaId] })

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
    // El filtro de legibilidad es defensa en profundidad: aunque una fila
    // vieja apunte a una categoría ajena, la lectura devuelve undefined en
    // vez de su nombre.
    .where(and(eq(categorias.id, gasto.categoriaId), categoriasLegibles(usuarioId)))
    .limit(1)

  return {
    ...gasto,
    montoEstimado: parseFloat(gasto.montoEstimado),
    categoriaNombre: cat?.nombre,
    categoriaIcono: cat?.icono,
    categoriaColor: cat?.color,
  }
}
