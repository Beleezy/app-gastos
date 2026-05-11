import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { crearGastoPlanificado } from '../../../services/planificador.service.js'
import { syncCreated } from '../../../utils/gcalAutoSync.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await readBody(event)

  try {
    const gasto = await crearGastoPlanificado({ usuarioId, body })
    syncCreated(usuarioId, gasto.id)
    return gasto
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
