import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { listarPerfiles } from '../../services/perfiles.service.js'

export default defineEventHandler(async (event) => {
  const propietarioId = await getUsuarioFromEvent(event)
  return listarPerfiles(propietarioId)
})
