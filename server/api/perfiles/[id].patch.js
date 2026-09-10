import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { perfilUpdateSchema } from '~/shared/schemas/perfiles.js'
import { actualizarPerfil } from '../../services/perfiles.service.js'
import { getUuidParam } from '../../utils/params.js'

export default defineEventHandler(async (event) => {
  const propietarioId = await getUsuarioFromEvent(event)
  const id = getUuidParam(event, 'id', { recurso: 'Perfil' })
  // Los perfiles son filas de `usuarios`: el cuerpo va derecho a esas
  // columnas. Sin schema, un `fechaNacimiento` de "ayer" llegaba a una
  // columna `date` y un nombre de 5000 caracteres a un varchar(255); los
  // dos salían como 500 con el SQL en el mensaje.
  const body = await validateBody(event, perfilUpdateSchema)
  try {
    return await actualizarPerfil(propietarioId, id, body)
  } catch (e) {
    if (e?.statusCode) throw createError({ statusCode: e.statusCode, message: e.message })
    throw e
  }
})
