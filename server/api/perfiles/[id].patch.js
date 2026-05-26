import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { actualizarPerfil } from '../../services/perfiles.service.js'

export default defineEventHandler(async (event) => {
  const propietarioId = await getUsuarioFromEvent(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  try {
    return await actualizarPerfil(propietarioId, id, {
      nombre: body?.nombre,
      telefono: body?.telefono,
      presupuesto: body?.presupuesto,
    })
  } catch (e) {
    if (e?.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw e
  }
})
