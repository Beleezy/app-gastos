import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { rechazarInvitacion } from '../../../../services/compartido.service.js'

export default defineEventHandler(async (event) => {
  const conexionId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  return rechazarInvitacion({ conexionId, usuarioId })
})
