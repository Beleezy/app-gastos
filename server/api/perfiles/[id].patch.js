import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { actualizarPerfil } from '../../services/perfiles.service.js'
import { getUuidParam } from '../../utils/params.js'

export default defineEventHandler(async (event) => {
  const propietarioId = await getUsuarioFromEvent(event)
  const id = getUuidParam(event, 'id', { recurso: 'Perfil' })
  const body = await readBody(event)
  try {
    return await actualizarPerfil(propietarioId, id, body || {})
  } catch (e) {
    if (e?.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw e
  }
})
