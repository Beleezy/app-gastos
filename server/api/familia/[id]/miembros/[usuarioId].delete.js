import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { quitarMiembro } from '../../../../services/espacios.service.js'

export default defineEventHandler(async (event) => {
  const espacioId = getRouterParam(event, 'id')
  const miembroUsuarioId = getRouterParam(event, 'usuarioId')
  const usuarioId = await getUsuarioFromEvent(event)
  try {
    return await quitarMiembro({ espacioId, duenoId: usuarioId, miembroUsuarioId })
  } catch (e) {
    if (e?.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw e
  }
})
