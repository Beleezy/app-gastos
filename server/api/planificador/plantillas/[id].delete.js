import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { eliminarPlantilla } from '../../../services/plantillasMes.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const plantillaId = getRouterParam(event, 'id')

  try {
    return await eliminarPlantilla({ usuarioId, plantillaId })
  } catch (e) {
    if (e?.statusCode) {
      throw createError({ statusCode: e.statusCode, message: e.message })
    }
    throw e
  }
})
