// Quitar un modelo del catálogo. Si Google lo sigue listando, el próximo
// descubrimiento lo vuelve a dar de alta (apagado si no es candidato).
import { requireSuperadmin } from '../../../utils/getUsuario.js'
import { getUuidParam } from '../../../utils/params.js'
import { eliminarModelo } from '../../../utils/modelosLlm.js'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const id = getUuidParam(event, 'id', { recurso: 'Modelo' })
  const eliminados = await eliminarModelo(id)
  if (!eliminados) throw createError({ statusCode: 404, message: 'Modelo no encontrado' })
  return { ok: true }
})
