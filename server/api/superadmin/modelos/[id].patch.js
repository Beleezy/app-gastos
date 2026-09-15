// Encender/apagar un modelo o cambiar su prioridad. Solo superadmin.
import { requireSuperadmin } from '../../../utils/getUsuario.js'
import { getUuidParam } from '../../../utils/params.js'
import { validateBody } from '../../../utils/validate.js'
import { modeloUpdateSchema } from '~/shared/schemas/modelosLlm.js'
import { actualizarModelo } from '../../../utils/modelosLlm.js'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const id = getUuidParam(event, 'id', { recurso: 'Modelo' })
  const body = await validateBody(event, modeloUpdateSchema)
  const fila = await actualizarModelo(id, body)
  if (!fila) throw createError({ statusCode: 404, message: 'Modelo no encontrado' })
  return fila
})
