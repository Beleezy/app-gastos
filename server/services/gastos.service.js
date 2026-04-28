// Capa de servicios de gastos. Ver §2.1 / §4.7 de planifica.md.
// Los handlers HTTP delegan aquí toda la lógica de negocio + acceso a DB.

import { eq, and } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { gastos, categorias } from '../database/schema.js'
import { getFechaHoraLocalUsuario } from '../utils/fechaLocal.js'

/**
 * Crea un gasto y devuelve la versión enriquecida con datos de categoría.
 *
 * @param {object} input
 * @param {string} input.usuarioId
 * @param {object} input.body Body validado por Zod (gastoCreateSchema).
 */
export async function crearGasto({ usuarioId, body }) {
  if (!body.categoriaId) {
    const err = new Error('La categoría es obligatoria')
    err.statusCode = 400
    throw err
  }

  const { fecha: fechaLocal, hora: horaLocal } = await getFechaHoraLocalUsuario(usuarioId)
  const fechaHoy = body.fecha || fechaLocal
  const horaActual = body.hora || horaLocal

  const [gasto] = await db
    .insert(gastos)
    .values({
      usuarioId,
      categoriaId: body.categoriaId,
      concepto: body.concepto.trim(),
      monto: String(body.monto),
      fecha: fechaHoy,
      hora: horaActual,
      metodoRegistro: body.metodoRegistro || 'manual',
      transcripcionVoz: body.transcripcionVoz || null,
      notas: body.notas || null,
      gastoPlanificadoId: body.gastoPlanificadoId || null,
    })
    .returning()

  const [cat] = await db
    .select()
    .from(categorias)
    .where(eq(categorias.id, gasto.categoriaId))
    .limit(1)

  return {
    ...gasto,
    monto: parseFloat(gasto.monto),
    categoriaNombre: cat?.nombre,
    categoriaIcono: cat?.icono,
    categoriaColor: cat?.color,
  }
}

/**
 * Devuelve un gasto por id, validando ownership.
 * @returns gasto enriquecido o null si no existe / no pertenece al usuario.
 */
export async function obtenerGastoPropio({ usuarioId, gastoId }) {
  const [gasto] = await db
    .select()
    .from(gastos)
    .where(and(eq(gastos.id, gastoId), eq(gastos.usuarioId, usuarioId)))
    .limit(1)

  if (!gasto) return null

  const [cat] = await db
    .select()
    .from(categorias)
    .where(eq(categorias.id, gasto.categoriaId))
    .limit(1)

  return {
    ...gasto,
    monto: parseFloat(gasto.monto),
    categoriaNombre: cat?.nombre,
    categoriaIcono: cat?.icono,
    categoriaColor: cat?.color,
  }
}
