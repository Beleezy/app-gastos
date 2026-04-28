import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { listarPlantillas } from '../../../services/plantillasMes.service.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  return await listarPlantillas(usuarioId)
})
