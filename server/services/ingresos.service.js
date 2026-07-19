// Capa de servicios de ingresos. Espejo simple de gastos.service pero
// sin categorías ni gastoPlanificadoId. Mismo patrón de soft-delete.

import { eq, and, isNull, between, desc, sql } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { ingresos } from '../database/schema.js'
import { assertOwner } from '../utils/assertOwner.js'

export async function crearIngreso({ usuarioId, body }) {
  const [ingreso] = await db
    .insert(ingresos)
    .values({
      usuarioId,
      concepto: body.concepto.trim(),
      monto: String(body.monto),
      fecha: body.fecha,
      origen: body.origen || null,
      esRecurrente: !!body.esRecurrente,
      metodoRegistro: body.metodoRegistro || 'manual',
      notas: body.notas || null,
    })
    .returning()

  return { ...ingreso, monto: parseFloat(ingreso.monto) }
}

export async function actualizarIngreso({ id, usuarioId, body }) {
  await assertOwner(ingresos, id, usuarioId)
  const set = { updatedAt: new Date() }
  if (body.concepto !== undefined) set.concepto = body.concepto.trim()
  if (body.monto !== undefined) set.monto = String(body.monto)
  if (body.fecha !== undefined) set.fecha = body.fecha
  if (body.origen !== undefined) set.origen = body.origen
  if (body.esRecurrente !== undefined) set.esRecurrente = !!body.esRecurrente
  if (body.notas !== undefined) set.notas = body.notas

  const [ingreso] = await db
    .update(ingresos)
    .set(set)
    .where(and(eq(ingresos.id, id), eq(ingresos.usuarioId, usuarioId), isNull(ingresos.deletedAt)))
    .returning()

  if (!ingreso) {
    const err = new Error('Ingreso no encontrado')
    err.statusCode = 404
    throw err
  }
  return { ...ingreso, monto: parseFloat(ingreso.monto) }
}

export async function softDeleteIngreso({ id, usuarioId }) {
  const [ingreso] = await db
    .update(ingresos)
    .set({ deletedAt: new Date() })
    .where(and(eq(ingresos.id, id), eq(ingresos.usuarioId, usuarioId), isNull(ingresos.deletedAt)))
    .returning({ id: ingresos.id })

  if (!ingreso) {
    const err = new Error('Ingreso no encontrado')
    err.statusCode = 404
    throw err
  }
  return { id: ingreso.id }
}

export async function listarIngresos({
  usuarioId,
  mes,
  anio,
  fechaDesde,
  fechaHasta,
  origen,
  limit,
  offset,
}) {
  const where = [eq(ingresos.usuarioId, usuarioId), isNull(ingresos.deletedAt)]
  if (mes && anio) {
    const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`
    const ultimoDiaNum = new Date(Number(anio), Number(mes), 0).getDate()
    const ultimaFecha = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`
    where.push(between(ingresos.fecha, primerDia, ultimaFecha))
  } else if (fechaDesde && fechaHasta) {
    where.push(between(ingresos.fecha, fechaDesde, fechaHasta))
  }
  if (origen) {
    where.push(eq(ingresos.origen, origen))
  }

  let q = db
    .select()
    .from(ingresos)
    .where(and(...where))
    .orderBy(desc(ingresos.fecha), desc(ingresos.createdAt))

  if (limit) q = q.limit(Math.min(Number(limit), 500))
  if (offset) q = q.offset(Number(offset))

  const rows = await q
  return rows.map((r) => ({ ...r, monto: parseFloat(r.monto) }))
}

export async function totalIngresosMes({ usuarioId, mes, anio }) {
  const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`
  const ultimoDiaNum = new Date(Number(anio), Number(mes), 0).getDate()
  const ultimaFecha = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`

  const [row] = await db
    .select({ total: sql`COALESCE(SUM(${ingresos.monto}), 0)` })
    .from(ingresos)
    .where(
      and(
        eq(ingresos.usuarioId, usuarioId),
        isNull(ingresos.deletedAt),
        between(ingresos.fecha, primerDia, ultimaFecha),
      ),
    )

  return parseFloat(row?.total || 0)
}
