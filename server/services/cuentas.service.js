// Capa de servicios de cuentas. El cálculo de saldo se hace on-demand
// (no materializado) para evitar drift por soft-delete/restore o
// reintentos idempotentes.

import { eq, and, isNull, sql } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { cuentas, gastos, ingresos, transferencias } from '../database/schema.js'
import { assertOwner } from '../utils/assertOwner.js'

export async function listarCuentas({ usuarioId, incluirSaldos = true }) {
  const filas = await db
    .select()
    .from(cuentas)
    .where(eq(cuentas.usuarioId, usuarioId))
    .orderBy(cuentas.orden, cuentas.createdAt)

  if (!incluirSaldos) return filas.map(formatear)

  // Calcular saldo por cuenta. Una sola consulta agregada por tabla
  // (3 consultas en paralelo) es suficiente — el N+1 ingenuo costaría
  // 4 * N consultas con N cuentas.
  const [gastosAgg, ingresosAgg, transfOutAgg, transfInAgg] = await Promise.all([
    db
      .select({ cuentaId: gastos.cuentaId, total: sql`COALESCE(SUM(${gastos.monto}), 0)` })
      .from(gastos)
      .where(and(eq(gastos.usuarioId, usuarioId), isNull(gastos.deletedAt)))
      .groupBy(gastos.cuentaId),
    db
      .select({ cuentaId: ingresos.cuentaId, total: sql`COALESCE(SUM(${ingresos.monto}), 0)` })
      .from(ingresos)
      .where(and(eq(ingresos.usuarioId, usuarioId), isNull(ingresos.deletedAt)))
      .groupBy(ingresos.cuentaId),
    db
      .select({ cuentaId: transferencias.cuentaOrigenId, total: sql`COALESCE(SUM(${transferencias.monto}), 0)` })
      .from(transferencias)
      .where(and(eq(transferencias.usuarioId, usuarioId), isNull(transferencias.deletedAt)))
      .groupBy(transferencias.cuentaOrigenId),
    db
      .select({ cuentaId: transferencias.cuentaDestinoId, total: sql`COALESCE(SUM(${transferencias.monto}), 0)` })
      .from(transferencias)
      .where(and(eq(transferencias.usuarioId, usuarioId), isNull(transferencias.deletedAt)))
      .groupBy(transferencias.cuentaDestinoId),
  ])

  const idx = (rows) => {
    const m = new Map()
    for (const r of rows) m.set(r.cuentaId || null, parseFloat(r.total))
    return m
  }
  const gIdx = idx(gastosAgg)
  const iIdx = idx(ingresosAgg)
  const tOutIdx = idx(transfOutAgg)
  const tInIdx = idx(transfInAgg)

  return filas.map((c) => ({
    ...formatear(c),
    totalGastos: gIdx.get(c.id) || 0,
    totalIngresos: iIdx.get(c.id) || 0,
    saldoActual: (
      parseFloat(c.saldoInicial)
      + (iIdx.get(c.id) || 0)
      - (gIdx.get(c.id) || 0)
      + (tInIdx.get(c.id) || 0)
      - (tOutIdx.get(c.id) || 0)
    ),
  }))
}

export async function crearCuenta({ usuarioId, body }) {
  // Si es la primera cuenta del usuario, marcarla como predeterminada.
  const [{ count }] = await db
    .select({ count: sql`COUNT(*)` })
    .from(cuentas)
    .where(eq(cuentas.usuarioId, usuarioId))

  const esPredeterminada = body.esPredeterminada === true || Number(count) === 0

  // Si se marca como predeterminada, desmarcar la anterior.
  if (esPredeterminada) {
    await db
      .update(cuentas)
      .set({ esPredeterminada: false })
      .where(and(eq(cuentas.usuarioId, usuarioId), eq(cuentas.esPredeterminada, true)))
  }

  const [c] = await db
    .insert(cuentas)
    .values({
      usuarioId,
      nombre: body.nombre.trim(),
      tipo: body.tipo,
      moneda: body.moneda || 'PEN',
      saldoInicial: String(body.saldoInicial ?? 0),
      icono: body.icono || null,
      color: body.color || null,
      orden: body.orden ?? 0,
      esPredeterminada,
      notas: body.notas || null,
    })
    .returning()
  return formatear(c)
}

export async function actualizarCuenta({ id, usuarioId, body }) {
  await assertOwner(cuentas, id, usuarioId)
  const set = { updatedAt: new Date() }
  if (body.nombre !== undefined) set.nombre = body.nombre.trim()
  if (body.tipo !== undefined) set.tipo = body.tipo
  if (body.moneda !== undefined) set.moneda = body.moneda
  if (body.saldoInicial !== undefined) set.saldoInicial = String(body.saldoInicial)
  if (body.icono !== undefined) set.icono = body.icono
  if (body.color !== undefined) set.color = body.color
  if (body.orden !== undefined) set.orden = body.orden
  if (body.archivada !== undefined) set.archivada = !!body.archivada
  if (body.notas !== undefined) set.notas = body.notas

  if (body.esPredeterminada === true) {
    await db
      .update(cuentas)
      .set({ esPredeterminada: false })
      .where(and(eq(cuentas.usuarioId, usuarioId), eq(cuentas.esPredeterminada, true)))
    set.esPredeterminada = true
  }

  const [c] = await db
    .update(cuentas)
    .set(set)
    .where(and(eq(cuentas.id, id), eq(cuentas.usuarioId, usuarioId)))
    .returning()
  return formatear(c)
}

export async function eliminarCuenta({ id, usuarioId }) {
  // No permitir eliminar si tiene transferencias activas (FK restrict).
  // Si hay movimientos en gastos/ingresos, esos quedarán con cuenta_id
  // = NULL (set null vía FK).
  const [{ count }] = await db
    .select({ count: sql`COUNT(*)` })
    .from(transferencias)
    .where(and(
      eq(transferencias.usuarioId, usuarioId),
      isNull(transferencias.deletedAt),
      sql`(${transferencias.cuentaOrigenId} = ${id} OR ${transferencias.cuentaDestinoId} = ${id})`,
    ))

  if (Number(count) > 0) {
    const err = new Error('La cuenta tiene transferencias asociadas; archívala en lugar de eliminarla')
    err.statusCode = 409
    throw err
  }

  const [c] = await db
    .delete(cuentas)
    .where(and(eq(cuentas.id, id), eq(cuentas.usuarioId, usuarioId)))
    .returning({ id: cuentas.id })
  if (!c) {
    const err = new Error('Cuenta no encontrada')
    err.statusCode = 404
    throw err
  }
  return { id: c.id }
}

export async function crearTransferencia({ usuarioId, body }) {
  if (body.cuentaOrigenId === body.cuentaDestinoId) {
    const err = new Error('Origen y destino deben ser cuentas distintas')
    err.statusCode = 400
    throw err
  }
  // Validar que ambas cuentas son del usuario.
  await Promise.all([
    assertOwner(cuentas, body.cuentaOrigenId, usuarioId),
    assertOwner(cuentas, body.cuentaDestinoId, usuarioId),
  ])

  const [t] = await db
    .insert(transferencias)
    .values({
      usuarioId,
      cuentaOrigenId: body.cuentaOrigenId,
      cuentaDestinoId: body.cuentaDestinoId,
      monto: String(body.monto),
      fecha: body.fecha,
      concepto: body.concepto || null,
      notas: body.notas || null,
    })
    .returning()
  return { ...t, monto: parseFloat(t.monto) }
}

function formatear(c) {
  return {
    ...c,
    saldoInicial: parseFloat(c.saldoInicial),
  }
}
