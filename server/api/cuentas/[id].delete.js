import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eliminarCuenta } from '../../services/cuentas.service.js'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const usuarioId = await getUsuarioFromEvent(event)
  try {
    const r = await eliminarCuenta({ id, usuarioId })
    return { success: true, id: r.id }
  } catch (e) {
    if (e?.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw e
  }
})
