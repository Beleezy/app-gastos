// Capa de servicios de gastos. Ver §2.1 / §4.7 de planifica.md.
// Los handlers HTTP delegan aquí toda la lógica de negocio + acceso a DB.

import { eq, and, sql } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { gastos, categorias } from '../database/schema.js'
import { getFechaHoraLocalUsuario } from '../utils/fechaLocal.js'
import { assertOwner } from '../utils/assertOwner.js'

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
 * Detecta posibles duplicados al confirmar gastos por voz/foto.
 * Considera duplicado un gasto del mismo usuario, mismo día y monto en
 * un rango de ±0.5%, con concepto similar (case-insensitive prefix).
 *
 * Ver §5.B punto 3 de planifica.md.
 *
 * @param {object} input
 * @param {string} input.usuarioId
 * @param {Array<{concepto: string, monto: number, fecha: string}>} input.candidatos
 * @returns Array<{candidato, duplicados: Array<gasto>}>
 */
export async function detectarDuplicados({ usuarioId, candidatos }) {
  if (!Array.isArray(candidatos) || candidatos.length === 0) return []

  const fechas = [...new Set(candidatos.map((c) => c.fecha).filter(Boolean))]
  if (fechas.length === 0) return []

  const existentes = await db
    .select({
      id: gastos.id,
      concepto: gastos.concepto,
      monto: gastos.monto,
      fecha: gastos.fecha,
    })
    .from(gastos)
    .where(and(eq(gastos.usuarioId, usuarioId), sql`${gastos.fecha} IN (${sql.join(fechas, sql`, `)})`))

  const tolerancia = (m) => Math.max(0.05, Math.abs(parseFloat(m)) * 0.005)
  const norm = (s) => String(s || '').trim().toLowerCase()

  return candidatos.map((c) => {
    const cm = parseFloat(c.monto)
    const tol = tolerancia(cm)
    const cn = norm(c.concepto)
    const duplicados = existentes.filter((g) => {
      if (g.fecha !== c.fecha) return false
      const gm = parseFloat(g.monto)
      if (Math.abs(gm - cm) > tol) return false
      const gn = norm(g.concepto)
      return gn === cn || gn.startsWith(cn) || cn.startsWith(gn)
    })
    return { candidato: c, duplicados }
  })
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
