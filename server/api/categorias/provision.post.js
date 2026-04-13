import { db } from '../../utils/db.js'
import { categorias, gastos, gastosPlanificados, planesMensuales, gastosFuturos } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, inArray } from 'drizzle-orm'

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
  const predefinidas = await db
    .select()
    .from(categorias)
    .where(eq(categorias.esPredefinida, true))

  if (predefinidas.length === 0) {
    return { provisioned: false, categories: [] }
  }

  // Clonar predefinidas como categorías del usuario
  const clonadas = await db
    .insert(categorias)
    .values(predefinidas.map(c => ({
      usuarioId,
      nombre: c.nombre,
      icono: c.icono,
      color: c.color,
      esPredefinida: false,
    })))
    .returning()

  // Construir mapa de IDs viejas -> nuevas
  const idMap = {}
  for (const vieja of predefinidas) {
    const nueva = clonadas.find(n => n.nombre === vieja.nombre)
    if (nueva) idMap[vieja.id] = nueva.id
  }

  // Migrar gastos del usuario a las nuevas categorías
  const oldIds = Object.keys(idMap)
  if (oldIds.length > 0) {
    for (const [oldId, newId] of Object.entries(idMap)) {
      await db
        .update(gastos)
        .set({ categoriaId: newId })
        .where(and(eq(gastos.usuarioId, usuarioId), eq(gastos.categoriaId, oldId)))
    }

    // Migrar gastos_planificados: necesitamos los planes del usuario
    const userPlanIds = await db
      .select({ id: planesMensuales.id })
      .from(planesMensuales)
      .where(eq(planesMensuales.usuarioId, usuarioId))

    if (userPlanIds.length > 0) {
      const planIds = userPlanIds.map(p => p.id)
      for (const [oldId, newId] of Object.entries(idMap)) {
        await db
          .update(gastosPlanificados)
          .set({ categoriaId: newId })
          .where(and(
            eq(gastosPlanificados.categoriaId, oldId),
            inArray(gastosPlanificados.planMensualId, planIds)
          ))
      }
    }

    for (const [oldId, newId] of Object.entries(idMap)) {
      await db
        .update(gastosFuturos)
        .set({ categoriaId: newId, updatedAt: new Date() })
        .where(and(
          eq(gastosFuturos.usuarioId, usuarioId),
          eq(gastosFuturos.categoriaId, oldId)
        ))
    }
  }

  return { provisioned: true, categories: clonadas }
})
