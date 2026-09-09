import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { aceptarInvitacion } from '../../../../services/compartido.service.js'
import { getUuidParam } from '../../../../utils/params.js'

export default defineEventHandler(async (event) => {
  const conexionId = getUuidParam(event, 'id', { recurso: 'Conexión' })
  const usuarioId = await getUsuarioFromEvent(event)
  return aceptarInvitacion({ conexionId, usuarioId })
})
