import { db } from '../../../utils/db.js'
import { mediosAhorro } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { validateBody } from '../../../utils/validate.js'
import { medioAhorroCreateSchema } from '~/shared/schemas/categorias.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  // `medioAhorroCreateSchema` existía sin usar mientras el handler
  // comprobaba solo `nombre`. `orden` entraba sin validar a una columna
  // integer (un `orden: "x"` reventaba el INSERT) y nombre/icono/color no
  // tenían tope de longitud pese a ser varchar.
  const body = await validateBody(event, medioAhorroCreateSchema)

  const [medio] = await db
    .insert(mediosAhorro)
    .values({
      usuarioId,
      nombre: body.nombre.trim(),
      tipo: body.tipo || 'otro',
      icono: body.icono || '💰',
      color: body.color || '#6B7280',
      orden: body.orden ?? 0,
    })
    .returning()

  return medio
})
