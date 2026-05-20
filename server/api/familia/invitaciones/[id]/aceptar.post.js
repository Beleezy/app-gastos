import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { aceptarInvitacion } from '../../../../services/espacios.service.js'

export default defineEventHandler(async (event) => {
  const invitacionId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  try {
    return await aceptarInvitacion({ invitacionId, usuarioId })
  } catch (e) {
    if (e?.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw e
  }
})
