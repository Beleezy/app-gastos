// Alta manual de un modelo (por si Google publica uno antes de que corra el
// descubrimiento, o para probar uno que no es candidato automático).
import { requireSuperadmin } from '../../../utils/getUsuario.js'
import { validateBody } from '../../../utils/validate.js'
import { modeloCreateSchema } from '~/shared/schemas/modelosLlm.js'
import { crearModeloManual } from '../../../utils/modelosLlm.js'

export default defineEventHandler(async (event) => {
  await requireSuperadmin(event)
  const body = await validateBody(event, modeloCreateSchema)
  const fila = await crearModeloManual(body.nombre)
  if (!fila) throw createError({ statusCode: 409, message: 'Ese modelo ya está en el catálogo' })
  setResponseStatus(event, 201)
  return fila
})
