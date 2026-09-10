import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { perfilCreateSchema } from '~/shared/schemas/perfiles.js'
import { crearPerfil } from '../../services/perfiles.service.js'

export default defineEventHandler(async (event) => {
  const propietarioId = await getUsuarioFromEvent(event)
  // Los perfiles son filas de `usuarios`: el cuerpo va derecho a esas
  // columnas. Sin schema, un `fechaNacimiento` de "ayer" llegaba a una
  // columna `date` y un nombre de 5000 caracteres a un varchar(255); los
  // dos salían como 500 con el SQL en el mensaje.
  const body = await validateBody(event, perfilCreateSchema)
  try {
    return await crearPerfil(propietarioId, body)
  } catch (e) {
    if (e?.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw e
  }
})
