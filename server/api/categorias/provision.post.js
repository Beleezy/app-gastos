import { db } from '../../utils/db.js'
import {
  categorias,
  gastos,
  gastosPlanificados,
  planesMensuales,
  gastosFuturos,
} from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, inArray } from 'drizzle-orm'
import { categoriasPredefinidasGlobales } from '../../utils/categorias.js'
import { caseUuidPorId } from '../../utils/sqlBatch.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  // Verificar si el usuario ya tiene categorías propias
  const userCats = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(eq(categorias.usuarioId, usuarioId))
    .limit(1)

  if (userCats.length > 0) {
    // Ya provisionado, retornar sus categorías
    const cats = await db
      .select()
      .from(categorias)
      .where(eq(categorias.usuarioId, usuarioId))
      .orderBy(categorias.nombre)
    return { provisioned: false, categories: cats }
  }

  // Obtener categorías predefinidas
  const predefinidas = await db.select().from(categorias).where(categoriasPredefinidasGlobales())

  if (predefinidas.length === 0) {
    return { provisioned: false, categories: [] }
  }

  // Clonar predefinidas como categorías del usuario y migrar en el mismo
  // acto sus gastos, planificados y futuros. Antes eran tres bucles con un
  // UPDATE por categoría (~33 round trips) y sin transacción: un fallo a
  // mitad dejaba las categorías clonadas y la mitad de los gastos apuntando
  // a las globales. Ahora son un INSERT y tres UPDATE con CASE.
  const clonadas = await db.transaction(async (tx) => {
    const clonadas = await tx
      .insert(categorias)
      .values(
        predefinidas.map((c) => ({
          usuarioId,
          nombre: c.nombre,
          icono: c.icono,
          color: c.color,
          esPredefinida: false,
        })),
      )
      .returning()

    // Mapa de ids viejas -> nuevas, por nombre.
    const nuevaPorNombre = new Map(clonadas.map((n) => [n.nombre, n.id]))
    const pares = predefinidas
      .map((vieja) => [vieja.id, nuevaPorNombre.get(vieja.nombre)])
      .filter(([, nueva]) => nueva)

    if (pares.length > 0) {
      const oldIds = pares.map(([vieja]) => vieja)

      await tx
        .update(gastos)
        .set({ categoriaId: caseUuidPorId(gastos.categoriaId, pares) })
        .where(and(eq(gastos.usuarioId, usuarioId), inArray(gastos.categoriaId, oldIds)))

      // gastos_planificados no tiene usuario_id: se llega por el plan.
      const userPlanIds = await tx
        .select({ id: planesMensuales.id })
        .from(planesMensuales)
        .where(eq(planesMensuales.usuarioId, usuarioId))

      if (userPlanIds.length > 0) {
        await tx
          .update(gastosPlanificados)
          .set({ categoriaId: caseUuidPorId(gastosPlanificados.categoriaId, pares) })
          .where(
            and(
              inArray(gastosPlanificados.categoriaId, oldIds),
              inArray(
                gastosPlanificados.planMensualId,
                userPlanIds.map((p) => p.id),
              ),
            ),
          )
      }

      await tx
        .update(gastosFuturos)
        .set({
          categoriaId: caseUuidPorId(gastosFuturos.categoriaId, pares),
          updatedAt: new Date(),
        })
        .where(
          and(eq(gastosFuturos.usuarioId, usuarioId), inArray(gastosFuturos.categoriaId, oldIds)),
        )
    }

    return clonadas
  })

  return { provisioned: true, categories: clonadas }
})
