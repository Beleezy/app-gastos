import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { balanceGlobal } from '../../services/deudas.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=300')
  return await balanceGlobal(usuarioId)
})
