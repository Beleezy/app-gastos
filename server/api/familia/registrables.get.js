import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { registrablesParaUsuario } from '../../services/espacios.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  return registrablesParaUsuario({ usuarioId })
})
