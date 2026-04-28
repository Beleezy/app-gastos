// Capa de servicios de deudas. Ver §2.1 / §5.C de planifica.md.

import { and, eq, sql } from 'drizzle-orm'
import { db } from '../utils/db.js'
import { deudas, personasEntidades } from '../database/schema.js'
import { crearDeudaEspejo, registrarAuditoria } from '../utils/vinculos.js'
import { getFechaHoraLocalUsuario } from '../utils/fechaLocal.js'

/**
 * Resuelve o crea la persona/entidad asociada a una deuda nueva.
 * Devuelve `personaId`. Si no se puede resolver lanza 400.
 */
async function resolverPersonaId({ usuarioId, body, tx = db }) {
  if (body.personaEntidadId) return body.personaEntidadId

  const nombre = body.personaNombre?.trim()
  if (!nombre) {
    const err = new Error('Se requiere persona o entidad')
    err.statusCode = 400
    throw err
  }

  const [existing] = await tx
    .select({ id: personasEntidades.id })
    .from(personasEntidades)
    .where(and(eq(personasEntidades.usuarioId, usuarioId), eq(personasEntidades.nombre, nombre)))
    .limit(1)

  if (existing) return existing.id

  const [nueva] = await tx
    .insert(personasEntidades)
    .values({ usuarioId, nombre, tipo: body.personaTipo || 'persona' })
    .returning()
  return nueva.id
}

/**
 * Crea una deuda y, si la persona está vinculada con otro usuario,
 * crea la deuda espejo en una transacción atómica.
 *
 * @param {object} input
 * @param {string} input.usuarioId
 * @param {object} input.body Body validado por Zod (deudaCreateSchema).
 */
export async function crearDeuda({ usuarioId, body }) {
  const personaId = await resolverPersonaId({ usuarioId, body })
  const monto = parseFloat(body.monto)

  const [persona] = await db
    .select()
    .from(personasEntidades)
    .where(eq(personasEntidades.id, personaId))
    .limit(1)

  if (!persona || persona.usuarioId !== usuarioId) {
    const err = new Error('Persona no encontrada')
    err.statusCode = 404
    throw err
  }

  const fechaCreacion = body.fecha || (await getFechaHoraLocalUsuario(usuarioId)).fecha

  const deudaValues = {
    usuarioId,
    personaEntidadId: personaId,
    tipoDeuda: body.tipoDeuda,
    concepto: body.concepto.trim(),
    montoOriginal: String(monto),
    montoPendiente: String(monto),
    fechaCreacion,
    fechaPago: body.fechaPago || null,
    notas: body.notas?.trim() || null,
  }

  let deuda
  if (persona.vinculoParId && persona.vinculadoUsuarioId) {
    deuda = await db.transaction(async (tx) => {
      const [nueva] = await tx.insert(deudas).values(deudaValues).returning()
      await crearDeudaEspejo(tx, nueva, persona.vinculoParId, persona.vinculadoUsuarioId)
      await registrarAuditoria(tx, {
        personaAId: personaId,
        personaBId: persona.vinculoParId,
        usuarioId,
        accion: 'deuda_creada',
        descripcion: `Nueva deuda: "${nueva.concepto}" por S/ ${monto}`,
        datos: {
          deudaId: nueva.id,
          concepto: nueva.concepto,
          monto,
          tipoDeuda: body.tipoDeuda,
        },
      })
      return nueva
    })
  } else {
    ;[deuda] = await db.insert(deudas).values(deudaValues).returning()
  }

  return {
    ...deuda,
    montoOriginal: parseFloat(deuda.montoOriginal),
    montoPendiente: parseFloat(deuda.montoPendiente),
    personaNombre: persona.nombre,
    personaTipo: persona.tipo,
  }
}

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
