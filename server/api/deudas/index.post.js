import { db } from '../../utils/db.js'
import { deudas, personasEntidades } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { crearDeudaEspejo, registrarAuditoria } from '../../utils/vinculos.js'
import { getFechaHoraLocalUsuario } from '../../utils/fechaLocal.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)

  if (!body.concepto?.trim()) {
    throw createError({ statusCode: 400, message: 'El concepto es obligatorio' })
  }
  if (!body.monto || body.monto <= 0) {
    throw createError({ statusCode: 400, message: 'El monto debe ser mayor a 0' })
  }
  if (!body.tipoDeuda) {
    throw createError({ statusCode: 400, message: 'El tipo de deuda es obligatorio' })
  }

  // Find or create persona
  let personaId = body.personaEntidadId
  if (!personaId && body.personaNombre?.trim()) {
    const [existing] = await db
      .select({ id: personasEntidades.id })
      .from(personasEntidades)
      .where(and(
        eq(personasEntidades.usuarioId, usuarioId),
        eq(personasEntidades.nombre, body.personaNombre.trim())
      ))
      .limit(1)

    if (existing) {
      personaId = existing.id
    } else {
      const [newPersona] = await db
        .insert(personasEntidades)
        .values({
          usuarioId,
          nombre: body.personaNombre.trim(),
          tipo: body.personaTipo || 'persona',
        })
        .returning()
      personaId = newPersona.id
    }
  }

  if (!personaId) {
    throw createError({ statusCode: 400, message: 'Se requiere una persona o entidad' })
  }

  const monto = parseFloat(body.monto)

  const [persona] = await db
    .select()
    .from(personasEntidades)
    .where(eq(personasEntidades.id, personaId))
    .limit(1)

  const deudaValues = {
    usuarioId,
    personaEntidadId: personaId,
    tipoDeuda: body.tipoDeuda,
    concepto: body.concepto.trim(),
    montoOriginal: String(monto),
    montoPendiente: String(monto),
    fechaCreacion: body.fecha || (await getFechaHoraLocalUsuario(usuarioId)).fecha,
    fechaPago: body.fechaPago || null,
    notas: body.notas?.trim() || null,
  }

  let deuda
  if (persona?.vinculoParId && persona?.vinculadoUsuarioId) {
    deuda = await db.transaction(async (tx) => {
      const [nuevaDeuda] = await tx.insert(deudas).values(deudaValues).returning()
      const deudaEspejo = await crearDeudaEspejo(tx, nuevaDeuda, persona.vinculoParId, persona.vinculadoUsuarioId)

      await registrarAuditoria(tx, {
        personaAId: personaId,
        personaBId: persona.vinculoParId,
        usuarioId,
        accion: 'deuda_creada',
        descripcion: `Nueva deuda: "${nuevaDeuda.concepto}" por S/ ${monto}`,
        datos: { deudaId: nuevaDeuda.id, concepto: nuevaDeuda.concepto, monto, tipoDeuda: body.tipoDeuda },
      })

      return nuevaDeuda
    })
  } else {
    [deuda] = await db.insert(deudas).values(deudaValues).returning()
  }

  return {
    ...deuda,
    montoOriginal: parseFloat(deuda.montoOriginal),
    montoPendiente: parseFloat(deuda.montoPendiente),
    personaNombre: persona?.nombre,
    personaTipo: persona?.tipo,
  }
})
