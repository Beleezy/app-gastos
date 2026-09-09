import { getUsuarioFromEvent } from '../../../../utils/getUsuario.js'
import { marcarAvisoLeido } from '../../../../services/compartido.service.js'
import { getUuidParam } from '../../../../utils/params.js'

export default defineEventHandler(async (event) => {
  const avisoId = getUuidParam(event, 'id', { recurso: 'Aviso' })
  const usuarioId = await getUsuarioFromEvent(event)
  return marcarAvisoLeido({ avisoId, usuarioId })
})
