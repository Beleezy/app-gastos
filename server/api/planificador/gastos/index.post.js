import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { crearGastoPlanificado } from '../../../services/planificador.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await readBody(event)

  try {
    return await crearGastoPlanificado({ usuarioId, body })
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
