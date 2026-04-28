import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { balanceGlobal } from '../../services/deudas.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  return await balanceGlobal(usuarioId)
})
