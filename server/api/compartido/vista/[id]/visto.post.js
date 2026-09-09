import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { marcarVisto } from '../../../../services/compartidoVista.service.js'
import { getUuidParam } from '../../../../utils/params.js'

export default defineEventHandler(async (event) => {
  const conexionId = getUuidParam(event, 'id', { recurso: 'Conexión' })
  const usuarioId = await getUsuarioFromEvent(event)
  return marcarVisto({ conexionId, usuarioId })
})
