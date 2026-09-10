import { db } from '../../../utils/db.js'
import { personasEntidades } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { validateBody } from '../../../utils/validate.js'
import { personaEntidadCreateSchema } from '~/shared/schemas/deudas.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  // `tipo` va a un pgEnum ('persona' | 'organizacion'). Sin validar, un
  // valor cualquiera llegaba al INSERT y salía como 500 con el SQL crudo
  // en el mensaje. El schema además traduce los valores legacy
  // ('entidad'/'banco' → organizacion, 'otro' → persona), que es
  // exactamente lo que su comentario decía resolver desde que se escribió.
  const body = await validateBody(event, personaEntidadCreateSchema)

  function capitalizarNombre(nombre) {
    return nombre
      .trim()
      .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
  }

  const [persona] = await db
    .insert(personasEntidades)
    .values({
      usuarioId,
      nombre: capitalizarNombre(body.nombre),
      tipo: body.tipo,
      contacto: body.contacto || null,
      notas: body.notas || null,
    })
    .returning()

  return persona
})
