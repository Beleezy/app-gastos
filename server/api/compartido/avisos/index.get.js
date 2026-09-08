import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { listarAvisos } from '../../../services/compartido.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const { conexionId } = getQuery(event)
  if (!conexionId) throw createError({ statusCode: 400, message: 'Falta conexionId' })
  setHeader(event, 'Cache-Control', 'private, max-age=15, stale-while-revalidate=120')
  return listarAvisos({ conexionId, usuarioId })
})
