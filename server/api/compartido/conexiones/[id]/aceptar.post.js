import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { aceptarInvitacion } from '../../../../services/compartido.service.js'

export default defineEventHandler(async (event) => {
  const conexionId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  return aceptarInvitacion({ conexionId, usuarioId })
})
