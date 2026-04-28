// Servicio de plantillas de mes. Ver §5.A punto 4 de planifica.md.
//
// Una plantilla guarda un set de gastos planificados típicos
// (concepto, monto, categoría, día) que el usuario puede aplicar a
// cualquier mes futuro en lugar de duplicar el del mes anterior.

import { and, desc, eq } from 'drizzle-orm'
import { db } from '../utils/db.js'
import {
  plantillasMes,
  planesMensuales,
  gastosPlanificados,
  categorias,
} from '../database/schema.js'

function parseGastosJson(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw !== 'string') return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

export async function listarPlantillas(usuarioId) {
  const filas = await db
    .select()
    .from(plantillasMes)
    .where(eq(plantillasMes.usuarioId, usuarioId))
    .orderBy(desc(plantillasMes.updatedAt))

  return filas.map((p) => ({
    ...p,
    montoPresupuesto: p.montoPresupuesto != null ? parseFloat(p.montoPresupuesto) : null,
    gastos: parseGastosJson(p.gastos),
  }))
}

export async function crearPlantilla({ usuarioId, body }) {
  const nombre = String(body?.nombre || '').trim()
  if (!nombre) {
    const err = new Error('El nombre es obligatorio')
    err.statusCode = 400
    throw err
  }
  const gastosArr = Array.isArray(body?.gastos) ? body.gastos : []
  const monto = body?.montoPresupuesto != null ? parseFloat(body.montoPresupuesto) : null

  const [creada] = await db
    .insert(plantillasMes)
    .values({
      usuarioId,
      nombre,
      montoPresupuesto: monto != null && Number.isFinite(monto) ? String(monto) : null,
      gastos: JSON.stringify(gastosArr.slice(0, 200)),
      notas: body?.notas ? String(body.notas).slice(0, 1000) : null,
    })
    .returning()

  return {
    ...creada,
    montoPresupuesto: creada.montoPresupuesto != null ? parseFloat(creada.montoPresupuesto) : null,
    gastos: parseGastosJson(creada.gastos),
  }
}

/**
 * Crea una plantilla a partir del plan actual del usuario.
 */
export async function crearPlantillaDesdePlan({ usuarioId, planMensualId, nombre, notas }) {
  const [plan] = await db
    .select()
    .from(planesMensuales)
    .where(and(eq(planesMensuales.id, planMensualId), eq(planesMensuales.usuarioId, usuarioId)))
    .limit(1)
  if (!plan) {
    const err = new Error('Plan no encontrado')
    err.statusCode = 404
    throw err
  }
  const gastos = await db
    .select({
      concepto: gastosPlanificados.concepto,
      montoEstimado: gastosPlanificados.montoEstimado,
      categoriaId: gastosPlanificados.categoriaId,
      fechaProbablePago: gastosPlanificados.fechaProbablePago,
      notas: gastosPlanificados.notas,
    })
    .from(gastosPlanificados)
    .where(eq(gastosPlanificados.planMensualId, planMensualId))

  const gastosJson = gastos.map((g) => ({
    concepto: g.concepto,
    montoEstimado: parseFloat(g.montoEstimado),
    categoriaId: g.categoriaId,
    diaProbable: g.fechaProbablePago ? Number(g.fechaProbablePago.slice(8, 10)) : null,
    notas: g.notas || null,
  }))

  return crearPlantilla({
    usuarioId,
    body: {
      nombre,
      montoPresupuesto: parseFloat(plan.montoPresupuesto) || null,
      gastos: gastosJson,
      notas,
    },
  })
}

/**
 * Aplica una plantilla a un plan existente: inserta los gastos
 * planificados con fecha calculada a partir de `diaProbable`.
 */
export async function aplicarPlantilla({ usuarioId, plantillaId, planMensualId }) {
  const [plantilla] = await db
    .select()
    .from(plantillasMes)
    .where(and(eq(plantillasMes.id, plantillaId), eq(plantillasMes.usuarioId, usuarioId)))
    .limit(1)
  if (!plantilla) {
    const err = new Error('Plantilla no encontrada')
    err.statusCode = 404
    throw err
  }
  const [plan] = await db
    .select()
    .from(planesMensuales)
    .where(and(eq(planesMensuales.id, planMensualId), eq(planesMensuales.usuarioId, usuarioId)))
    .limit(1)
  if (!plan) {
    const err = new Error('Plan no encontrado')
    err.statusCode = 404
    throw err
  }

  const items = parseGastosJson(plantilla.gastos)
  if (items.length === 0) return { creados: 0 }

  // Validar que todas las categorías referenciadas existan para el usuario
  const categoriasValidas = await db
    .select({ id: categorias.id })
    .from(categorias)
  const setValidas = new Set(categoriasValidas.map((c) => c.id))

  const ultimoDiaMes = new Date(plan.anio, plan.mes, 0).getDate()
  const valores = []
  for (const it of items) {
    if (!it?.concepto) continue
    const monto = parseFloat(it.montoEstimado)
    if (!Number.isFinite(monto) || monto <= 0) continue
    if (!setValidas.has(it.categoriaId)) continue
    const dia = Math.max(1, Math.min(ultimoDiaMes, parseInt(it.diaProbable, 10) || 1))
    const fechaProbablePago = `${plan.anio}-${String(plan.mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    valores.push({
      planMensualId,
      categoriaId: it.categoriaId,
      concepto: String(it.concepto).slice(0, 200),
      montoEstimado: String(monto),
      fechaProbablePago,
      notas: it.notas ? String(it.notas).slice(0, 1000) : null,
    })
  }

  if (valores.length === 0) return { creados: 0 }
  const insertados = await db.insert(gastosPlanificados).values(valores).returning({ id: gastosPlanificados.id })
  return { creados: insertados.length }
}

export async function eliminarPlantilla({ usuarioId, plantillaId }) {
  const filas = await db
    .delete(plantillasMes)
    .where(and(eq(plantillasMes.id, plantillaId), eq(plantillasMes.usuarioId, usuarioId)))
    .returning({ id: plantillasMes.id })
  if (filas.length === 0) {
    const err = new Error('Plantilla no encontrada')
    err.statusCode = 404
    throw err
  }
  return { ok: true }
}
