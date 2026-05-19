import { db } from '../../../../utils/db.js'
import { solicitudesVinculo, personasEntidades, deudas, pagosDeuda, usuarios } from '../../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { crearDeudasEspejoBulk, crearPagosEspejoBulk, registrarAuditoria, getNombreDisplay, normalizarParPersonas, crearCheckpoint } from '../../../../utils/vinculos.js'
import { eq, and, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const solicitudId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)

  // Obtener email del usuario actual
  const [usuario] = await db
    .select({ email: usuarios.email, nombre: usuarios.nombre })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1)

  if (!usuario?.email) {
    throw createError({ statusCode: 400, message: 'Tu cuenta no tiene email registrado' })
  }

  // Obtener solicitud y verificar que es para este usuario
  const [solicitud] = await db
    .select()
    .from(solicitudesVinculo)
    .where(and(
      eq(solicitudesVinculo.id, solicitudId),
      eq(solicitudesVinculo.estado, 'pendiente')
    ))
    .limit(1)

  if (!solicitud) {
    throw createError({ statusCode: 404, message: 'Solicitud no encontrada o ya procesada' })
  }

  if (solicitud.destinatarioEmail.toLowerCase() !== usuario.email.toLowerCase()) {
    throw createError({ statusCode: 403, message: 'Esta solicitud no es para ti' })
  }

  // Obtener la persona del remitente
  const [personaRemitente] = await db
    .select()
    .from(personasEntidades)
    .where(eq(personasEntidades.id, solicitud.personaEntidadId))
    .limit(1)

  if (!personaRemitente) {
    throw createError({ statusCode: 404, message: 'La persona asociada ya no existe' })
  }

  if (personaRemitente.vinculadoUsuarioId) {
    throw createError({ statusCode: 400, message: 'Esta persona ya está vinculada con otro usuario' })
  }

  // Validar: solo una sincronización activa entre estos 2 usuarios
  const [vinculoExistente] = await db
    .select({ id: personasEntidades.id })
    .from(personasEntidades)
    .where(and(
      eq(personasEntidades.usuarioId, usuarioId),
      eq(personasEntidades.vinculadoUsuarioId, solicitud.remitenteId)
    ))
    .limit(1)

  if (vinculoExistente) {
    throw createError({ statusCode: 400, message: 'Ya existe un vínculo activo entre tú y este usuario' })
  }

  // Obtener nombre del remitente (display name: config primero, luego usuarios)
  const nombreRemitente = await getNombreDisplay(solicitud.remitenteId)
  // Obtener nombre del destinatario (yo) para crear la persona espejo en la cuenta del remitente
  const nombreDestinatario = await getNombreDisplay(usuarioId)

  // Todo en una transacción
  const resultado = await db.transaction(async (tx) => {
    // 1. Crear persona espejo en la cuenta del destinatario (yo)
    //    El nombre debe ser el del remitente (es quien me "debe" o "debo")
    const [personaEspejo] = await tx
      .insert(personasEntidades)
      .values({
        usuarioId,
        nombre: nombreRemitente,
        tipo: 'persona',
        vinculadoUsuarioId: solicitud.remitenteId,
      })
      .returning()

    // 2. Vincular persona del remitente → destinatario
    //    Actualizar nombre del remitente con nombre display del destinatario
    await tx
      .update(personasEntidades)
      .set({
        vinculadoUsuarioId: usuarioId,
        vinculoParId: personaEspejo.id,
        nombre: personaRemitente.nombre, // conservar nombre original que el remitente puso
        updatedAt: new Date(),
      })
      .where(eq(personasEntidades.id, personaRemitente.id))

    // 3. Vincular persona espejo → persona del remitente
    await tx
      .update(personasEntidades)
      .set({ vinculoParId: personaRemitente.id })
      .where(eq(personasEntidades.id, personaEspejo.id))

    // 4. Espejar deudas activas del remitente para esta persona
    const deudasActivas = await tx
      .select()
      .from(deudas)
      .where(and(
        eq(deudas.personaEntidadId, personaRemitente.id),
        inArray(deudas.estado, ['pendiente', 'parcial'])
      ))

    // 4b. Espejar deudas en bulk: 1 INSERT batch (vs N INSERTs anteriores).
    const deudaEspejoMap = await crearDeudasEspejoBulk(tx, deudasActivas, personaEspejo.id, usuarioId)

    // 5. Espejar pagos en bulk: 1 SELECT (todos los pagos) + 1 INSERT batch.
    let pagosSincronizados = 0
    if (deudasActivas.length > 0) {
      const pagosTodos = await tx
        .select()
        .from(pagosDeuda)
        .where(inArray(pagosDeuda.deudaId, deudasActivas.map(d => d.id)))

      const pagosConEspejo = pagosTodos
        .map(p => ({ pago: p, deudaEspejoId: deudaEspejoMap.get(p.deudaId) }))
        .filter(x => x.deudaEspejoId)

      pagosSincronizados = await crearPagosEspejoBulk(tx, pagosConEspejo)
    }

    // 6. Marcar solicitud como aceptada
    await tx
      .update(solicitudesVinculo)
      .set({
        estado: 'aceptada',
        destinatarioId: usuarioId,
        updatedAt: new Date(),
      })
      .where(eq(solicitudesVinculo.id, solicitudId))

    // 7. Registrar auditoría del vínculo creado
    await registrarAuditoria(tx, {
      personaAId: personaRemitente.id,
      personaBId: personaEspejo.id,
      usuarioId,
      accion: 'vinculo_creado',
      descripcion: `${nombreDestinatario} aceptó el vínculo con ${nombreRemitente}`,
      datos: {
        solicitudId,
        deudasSincronizadas: deudasActivas.length,
        pagosSincronizados,
      },
    })

    // 8. Crear punto de guardado inicial (inicio_vinculo) — inmutable
    const { personaAId, personaBId } = normalizarParPersonas(personaRemitente.id, personaEspejo.id)
    await crearCheckpoint(tx, {
      personaAId,
      personaBId,
      tipo: 'inicio_vinculo',
      creadoPorId: usuarioId,
      descripcion: `Estado inicial al vincular: ${nombreRemitente} ↔ ${nombreDestinatario}`,
    })

    return {
      personaEspejo,
      deudasEspejadas: deudasActivas.length,
      pagosEspejados: pagosSincronizados,
      nombreRemitente,
    }
  })

  return {
    mensaje: 'Vínculo aceptado exitosamente',
    personaCreada: resultado.nombreRemitente,
    deudasSincronizadas: resultado.deudasEspejadas,
    pagosSincronizados: resultado.pagosEspejados,
  }
})
