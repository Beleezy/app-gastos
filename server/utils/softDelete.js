// Helpers para soft delete. Las entidades con `deleted_at` (gastos,
// deudas, pagos_deuda) usan UPDATE en vez de DELETE físico. Toda consulta
// de listado debe filtrar `deleted_at IS NULL`; la papelera invierte el
// filtro. El purgado físico de filas borradas hace > 30 días corre en
// `/api/cron/purgar-papelera`.

import { isNull, eq, and, sql } from 'drizzle-orm'
import { db } from './db.js'

/**
 * Condición Drizzle para excluir filas borradas. Úsalo en .where() de
 * cualquier SELECT que liste entidades activas.
 *
 *   .where(and(eq(gastos.usuarioId, uid), notDeleted(gastos)))
 */
export function notDeleted(table) {
  return isNull(table.deletedAt)
}

/**
 * Condición Drizzle para incluir SOLO filas borradas (papelera).
 */
export function onlyDeleted(table) {
  return sql`${table.deletedAt} IS NOT NULL`
}

/**
 * Soft delete genérico: marca `deleted_at = now()` solo si el row es del
 * usuario. Devuelve el row borrado (o undefined si no existía / no era
 * del usuario). NO sirve para tablas sin `deletedAt` — usa DELETE normal.
 */
export async function softDeleteRow(table, id, usuarioId) {
  const rows = await db
    .update(table)
    .set({ deletedAt: new Date() })
    .where(and(eq(table.id, id), eq(table.usuarioId, usuarioId), isNull(table.deletedAt)))
    .returning()
  return rows[0]
}

/**
 * Restaura un row borrado (papelera → activo). Devuelve undefined si el
 * row no existía borrado o no era del usuario.
 */
export async function restoreRow(table, id, usuarioId) {
  const rows = await db
    .update(table)
    .set({ deletedAt: null })
    .where(
      and(eq(table.id, id), eq(table.usuarioId, usuarioId), sql`${table.deletedAt} IS NOT NULL`),
    )
    .returning()
  return rows[0]
}
