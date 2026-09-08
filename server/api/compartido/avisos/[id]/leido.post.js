import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { marcarAvisoLeido } from '../../../../services/compartido.service.js'

export default defineEventHandler(async (event) => {
  const avisoId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  return marcarAvisoLeido({ avisoId, usuarioId })
})
