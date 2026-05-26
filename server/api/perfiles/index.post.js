import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { crearPerfil } from '../../services/perfiles.service.js'

export default defineEventHandler(async (event) => {
  const propietarioId = await getUsuarioFromEvent(event)
  const body = await readBody(event)
  try {
    return await crearPerfil(propietarioId, {
      nombre: body?.nombre,
      telefono: body?.telefono,
      presupuesto: body?.presupuesto,
    })
  } catch (e) {
    if (e?.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw e
  }
})
