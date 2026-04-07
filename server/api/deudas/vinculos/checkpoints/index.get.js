import { db } from '../../../../utils/db.js'
import { vinculosCheckpoints, personasEntidades, auditoriaVinculos, usuarios, configuraciones } from '../../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { normalizarParPersonas } from '../../../../utils/vinculos.js'
import { eq, and, or, gte, lt, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const { personaId } = getQuery(event)

  if (!personaId) {
    throw createError({ statusCode: 400, message: 'personaId requerido' })
  }

  // Verificar que la persona pertenece al usuario
  const [persona] = await db
    .select()
    .from(personasEntidades)
    .where(and(
      eq(personasEntidades.id, personaId),
      eq(personasEntidades.usuarioId, usuarioId)
    ))
    .limit(1)

  if (!persona) {
    throw createError({ statusCode: 404, message: 'Persona no encontrada' })
  }

  if (!persona.vinculadoUsuarioId) {
    throw createError({ statusCode: 400, message: 'Esta persona no tiene un vínculo activo' })
  }

  const parPersonaId = persona.vinculoParId
  if (!parPersonaId) {
    throw createError({ statusCode: 400, message: 'Vínculo incompleto: persona par no encontrada' })
  }

  const { personaAId } = normalizarParPersonas(personaId, parPersonaId)

  // Obtener todos los checkpoints del par
  const checkpoints = await db
    .select()
    .from(vinculosCheckpoints)
    .where(eq(vinculosCheckpoints.personaAId, personaAId))
    .orderBy(asc(vinculosCheckpoints.createdAt))

  // Para cada checkpoint, obtener auditoría del período que cubre
  // El período es: desde checkpoint.createdAt hasta el siguiente checkpoint (o ahora si es el último)
  const checkpointsConAuditoria = []

  for (let i = 0; i < checkpoints.length; i++) {
    const cp = checkpoints[i]
    const siguiente = checkpoints[i + 1]

    // Auditoría: acciones que ocurrieron DESPUÉS de este checkpoint y ANTES del siguiente
    const condiciones = [
      or(
        eq(auditoriaVinculos.personaAId, personaId),
        eq(auditoriaVinculos.personaBId, personaId),
        eq(auditoriaVinculos.personaAId, parPersonaId),
        eq(auditoriaVinculos.personaBId, parPersonaId)
      ),
      gte(auditoriaVinculos.createdAt, new Date(cp.createdAt)),
    ]

    if (siguiente) {
      condiciones.push(lt(auditoriaVinculos.createdAt, new Date(siguiente.createdAt)))
    }

    const auditoria = await db
      .select({
        id: auditoriaVinculos.id,
        accion: auditoriaVinculos.accion,
        descripcion: auditoriaVinculos.descripcion,
        datos: auditoriaVinculos.datos,
        createdAt: auditoriaVinculos.createdAt,
        usuarioId: auditoriaVinculos.usuarioId,
      })
      .from(auditoriaVinculos)
      .where(and(...condiciones))
      .orderBy(asc(auditoriaVinculos.createdAt))

    // Enriquecer cada entrada con nombre del usuario que actuó
    const auditoriaEnriquecida = await Promise.all(
      auditoria.map(async (entrada) => {
        const [config] = await db
          .select({ nombre: configuraciones.nombre })
          .from(configuraciones)
          .where(eq(configuraciones.usuarioId, entrada.usuarioId))
          .limit(1)

        const [user] = await db
          .select({ nombre: usuarios.nombre })
          .from(usuarios)
          .where(eq(usuarios.id, entrada.usuarioId))
          .limit(1)

        const nombreActor = config?.nombre?.trim() || user?.nombre?.trim() || 'Usuario'
        const esTuyo = entrada.usuarioId === usuarioId

        return {
          ...entrada,
          datos: entrada.datos ? JSON.parse(entrada.datos) : null,
          nombreActor,
          esTuyo,
        }
      })
    )

    checkpointsConAuditoria.push({
      id: cp.id,
      tipo: cp.tipo,
      descripcion: cp.descripcion,
      createdAt: cp.createdAt,
      creadoPorId: cp.creadoPorId,
      snapshotResumen: calcularResumenSnapshot(cp.snapshotDatos),
      auditoria: auditoriaEnriquecida,
    })
  }

  return checkpointsConAuditoria
})

/**
 * Calcula un resumen del snapshot sin devolver todos los datos raw
 */
function calcularResumenSnapshot(snapshotDatosStr) {
  try {
    const data = JSON.parse(snapshotDatosStr)
    const deudasA = data.personaA?.deudas || []
    const deudasB = data.personaB?.deudas || []

    const totalA = deudasA.reduce((s, d) => s + parseFloat(d.montoPendiente || 0), 0)
    const totalB = deudasB.reduce((s, d) => s + parseFloat(d.montoPendiente || 0), 0)
    const totalPagosA = deudasA.reduce((s, d) => s + (d.pagos?.length || 0), 0)

    return {
      personaANombre: data.personaA?.nombre || null,
      personaBNombre: data.personaB?.nombre || null,
      totalDeudasA: deudasA.length,
      totalDeudasB: deudasB.length,
      totalPendienteA: Math.round(totalA * 100) / 100,
      totalPendienteB: Math.round(totalB * 100) / 100,
      totalPagos: totalPagosA,
      fechaSnapshot: data.fechaSnapshot || null,
    }
  } catch {
    return null
  }
}
