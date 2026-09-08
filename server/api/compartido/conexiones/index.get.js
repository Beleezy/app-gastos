import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { listarConexiones } from '../../../services/compartido.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  setHeader(event, 'Cache-Control', 'private, max-age=30, stale-while-revalidate=180')
  return listarConexiones({ usuarioId })
})
