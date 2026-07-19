import { db } from '../../../utils/db.js'
import { solicitudesVinculo, personasEntidades, usuarios } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { getNombreDisplay } from '../../../utils/vinculos.js'
import { rateLimits } from '../../../utils/rateLimit.js'
import { eq, and, or } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const usuarioId = await getUsuarioFromEvent(event)
  await rateLimits.vinculosSolicitar(event, usuarioId)

  const email = body.email?.trim()?.toLowerCase()
  if (!email) {
    throw createError({ statusCode: 400, message: 'El email es obligatorio' })
  }
  if (!body.personaEntidadId) {
    throw createError({ statusCode: 400, message: 'Se requiere la persona a vincular' })
  }

  // Verificar que la persona pertenece al usuario
  const [persona] = await db
    .select()
    .from(personasEntidades)
    .where(
      and(
        eq(personasEntidades.id, body.personaEntidadId),
        eq(personasEntidades.usuarioId, usuarioId),
      ),
    )
    .limit(1)

  if (!persona) {
    throw createError({ statusCode: 404, message: 'Persona no encontrada' })
  }

  // No permitir si ya está vinculada
  if (persona.vinculadoUsuarioId) {
    throw createError({ statusCode: 400, message: 'Esta persona ya está vinculada con un usuario' })
  }

  // Obtener datos del remitente
  const [remitente] = await db
    .select({ email: usuarios.email, id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1)

  if (!remitente?.email) {
    throw createError({ statusCode: 400, message: 'Tu cuenta no tiene email registrado' })
  }

  // No permitir auto-vinculación
  if (remitente.email.toLowerCase() === email) {
    throw createError({ statusCode: 400, message: 'No puedes vincularte contigo mismo' })
  }

  // Buscar si el destinatario ya tiene cuenta
  const [destinatario] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1)

  // Validar: solo una sincronización activa entre 2 usuarios
  // Verificar si ya existe un vínculo activo entre estos dos usuarios (por personas vinculadas)
  const [vinculoExistente] = await db
    .select({ id: personasEntidades.id })
    .from(personasEntidades)
    .where(
      and(
        eq(personasEntidades.usuarioId, usuarioId),
        eq(
          personasEntidades.vinculadoUsuarioId,
          destinatario?.id || '00000000-0000-0000-0000-000000000000',
        ),
      ),
    )
    .limit(1)

  if (vinculoExistente) {
    throw createError({
      statusCode: 400,
      message:
        'Ya tienes un vínculo activo con este usuario. Solo se permite un vínculo por par de usuarios.',
    })
  }

  // También verificar si el destinatario ya tiene vínculo activo hacia el remitente
  if (destinatario?.id) {
    const [vinculoInverso] = await db
      .select({ id: personasEntidades.id })
      .from(personasEntidades)
      .where(
        and(
          eq(personasEntidades.usuarioId, destinatario.id),
          eq(personasEntidades.vinculadoUsuarioId, usuarioId),
        ),
      )
      .limit(1)

    if (vinculoInverso) {
      throw createError({
        statusCode: 400,
        message: 'Ya existe un vínculo activo entre tú y este usuario.',
      })
    }
  }

  // Verificar que no existe solicitud pendiente duplicada para este par de usuarios
  if (destinatario?.id) {
    const [solicitudDuplicada] = await db
      .select({ id: solicitudesVinculo.id })
      .from(solicitudesVinculo)
      .where(
        and(
          eq(solicitudesVinculo.estado, 'pendiente'),
          or(
            and(
              eq(solicitudesVinculo.remitenteId, usuarioId),
              eq(solicitudesVinculo.destinatarioId, destinatario.id),
            ),
            and(
              eq(solicitudesVinculo.remitenteId, destinatario.id),
              eq(solicitudesVinculo.destinatarioId, usuarioId),
            ),
          ),
        ),
      )
      .limit(1)

    if (solicitudDuplicada) {
      throw createError({
        statusCode: 400,
        message: 'Ya existe una solicitud pendiente entre tú y este usuario',
      })
    }
  }

  // Verificar solicitud pendiente por email (para usuarios no registrados aún)
  const [existentePorEmail] = await db
    .select({ id: solicitudesVinculo.id })
    .from(solicitudesVinculo)
    .where(
      and(
        eq(solicitudesVinculo.remitenteId, usuarioId),
        eq(solicitudesVinculo.destinatarioEmail, email),
        eq(solicitudesVinculo.estado, 'pendiente'),
      ),
    )
    .limit(1)

  if (existentePorEmail) {
    throw createError({
      statusCode: 400,
      message: 'Ya existe una solicitud pendiente para este email',
    })
  }

  // Obtener nombre display del remitente para incluir en la solicitud
  const nombreDisplay = await getNombreDisplay(usuarioId)

  const [solicitud] = await db
    .insert(solicitudesVinculo)
    .values({
      remitenteId: usuarioId,
      destinatarioEmail: email,
      destinatarioId: destinatario?.id || null,
      personaEntidadId: body.personaEntidadId,
      mensaje: body.mensaje?.trim() || null,
    })
    .returning()

  return {
    ...solicitud,
    personaNombre: persona.nombre,
    remitenteNombre: nombreDisplay,
    destinatarioRegistrado: !!destinatario,
  }
})
