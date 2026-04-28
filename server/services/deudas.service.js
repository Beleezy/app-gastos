// Capa de servicios de deudas. Ver §2.1 / §5.C de planifica.md.

import { and, eq, sql } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { deudas, personasEntidades } from '../database/schema.js'

/**
 * Devuelve el balance neto del usuario y un desglose por persona.
 * Ver §5.C punto 7 de planifica.md (vista global de balance).
 *
 * @param {string} usuarioId
 */
export async function balanceGlobal(usuarioId) {
  const rows = await db
    .select({
      personaId: personasEntidades.id,
      persona: personasEntidades.nombre,
      tipoDeuda: deudas.tipoDeuda,
      total: sql`COALESCE(SUM(${deudas.montoPendiente}), 0)`.as('total'),
    })
    .from(deudas)
    .innerJoin(personasEntidades, eq(deudas.personaEntidadId, personasEntidades.id))
    .where(and(eq(deudas.usuarioId, usuarioId), sql`${deudas.estado} != 'archivado'`))
    .groupBy(personasEntidades.id, personasEntidades.nombre, deudas.tipoDeuda)

  const porPersona = new Map()
  let totalMeDeben = 0
  let totalYoDebo = 0

  for (const r of rows) {
    const total = parseFloat(r.total) || 0
    if (!porPersona.has(r.personaId)) {
      porPersona.set(r.personaId, {
        personaId: r.personaId,
        persona: r.persona,
        meDeben: 0,
        yoDebo: 0,
        balance: 0,
      })
    }
    const item = porPersona.get(r.personaId)
    if (r.tipoDeuda === 'me_deben') {
      item.meDeben += total
      totalMeDeben += total
    } else if (r.tipoDeuda === 'yo_debo') {
      item.yoDebo += total
      totalYoDebo += total
    }
    item.balance = item.meDeben - item.yoDebo
  }

  const personas = [...porPersona.values()].sort(
    (a, b) => Math.abs(b.balance) - Math.abs(a.balance),
  )

  return {
    totalMeDeben: Math.round(totalMeDeben * 100) / 100,
    totalYoDebo: Math.round(totalYoDebo * 100) / 100,
    balanceNeto: Math.round((totalMeDeben - totalYoDebo) * 100) / 100,
    personas,
  }
}
