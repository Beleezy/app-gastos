import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { listarMiembros } from '../../../services/espacios.service.js'

export default defineEventHandler(async (event) => {
  const espacioId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  try {
    return await listarMiembros({ espacioId, usuarioId })
  } catch (e) {
    if (e?.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw e
  }
})
