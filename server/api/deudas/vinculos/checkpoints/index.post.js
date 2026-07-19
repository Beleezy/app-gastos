import { db } from '../../../../utils/db.js'
import { personasEntidades } from '../../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import {
  normalizarParPersonas,
  crearCheckpoint,
  registrarAuditoria,
  getNombreDisplay,
} from '../../../../utils/vinculos.js'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await readBody(event)
  const { personaId, descripcion } = body

  if (!personaId) {
    throw createError({ statusCode: 400, message: 'personaId requerido' })
  }

  // Verificar que la persona pertenece al usuario y tiene vínculo activo
  const [persona] = await db
    .select()
    .from(personasEntidades)
    .where(and(eq(personasEntidades.id, personaId), eq(personasEntidades.usuarioId, usuarioId)))
    .limit(1)

  if (!persona) {
    throw createError({ statusCode: 404, message: 'Persona no encontrada' })
  }

  if (!persona.vinculadoUsuarioId || !persona.vinculoParId) {
    throw createError({ statusCode: 400, message: 'Esta persona no tiene un vínculo activo' })
  }

  const { personaAId, personaBId } = normalizarParPersonas(personaId, persona.vinculoParId)

  const nombreCreador = await getNombreDisplay(usuarioId)

  const checkpoint = await db.transaction(async (tx) => {
    const cp = await crearCheckpoint(tx, {
      personaAId,
      personaBId,
      tipo: 'actual',
      creadoPorId: usuarioId,
      descripcion: descripcion?.trim() || null,
    })

    const descAuditoria = descripcion?.trim()
      ? `${nombreCreador} guardó un punto de guardado: "${descripcion.trim()}"`
      : `${nombreCreador} guardó un punto de guardado`

    await registrarAuditoria(tx, {
      personaAId: persona.id,
      personaBId: persona.vinculoParId,
      usuarioId,
      accion: 'checkpoint_creado',
      descripcion: descAuditoria,
      datos: {
        checkpointId: cp.id,
        tipo: 'actual',
        descripcionUsuario: descripcion?.trim() || null,
      },
    })

    return cp
  })

  return {
    mensaje: 'Punto de guardado creado correctamente',
    checkpointId: checkpoint.id,
    tipo: checkpoint.tipo,
    createdAt: checkpoint.createdAt,
  }
})
