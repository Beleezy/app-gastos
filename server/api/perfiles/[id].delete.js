import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eliminarPerfil } from '../../services/perfiles.service.js'

export default defineEventHandler(async (event) => {
  const propietarioId = await getUsuarioFromEvent(event)
  const id = getRouterParam(event, 'id')
  try {
    return await eliminarPerfil(propietarioId, id)
  } catch (e) {
    if (e?.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw e
  }
})
