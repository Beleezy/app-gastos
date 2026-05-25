import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { agregarMiembroDirecto } from '../../../services/espacios.service.js'

export default defineEventHandler(async (event) => {
  const espacioId = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await readBody(event)
  try {
    return await agregarMiembroDirecto({
      espacioId,
      duenoId: usuarioId,
      email: body?.email,
      rol: body?.rol,
    })
  } catch (e) {
    if (e?.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw e
  }
})
