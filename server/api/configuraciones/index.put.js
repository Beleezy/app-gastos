import { db } from '../../utils/db.js'
import { configuraciones } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { validateBody } from '../../utils/validate.js'
import { configuracionUpdateSchema } from '~/shared/schemas/configuraciones.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  // El handler copiaba cada campo a mano con `String()`/`!!` y sin
  // comprobar nada más: `presupuestoMensualDefault: "abc"` iba a una
  // columna NUMERIC, una moneda de 30 caracteres a un varchar(10) y
  // `diaInicioCiclo: "x"` a un integer. Los tres salían como 500 con la
  // consulta y sus parámetros en el mensaje. Es la pantalla de ajustes.
  const body = await validateBody(event, configuracionUpdateSchema)

  const set = { updatedAt: new Date() }
  for (const [clave, valor] of Object.entries(body)) {
    set[clave] = clave === 'presupuestoMensualDefault' ? String(valor) : valor
  }

  // Upsert: el GET crea la fila si no existe, pero un PUT que llegue antes
  // (cola offline, primera visita directa a /configuraciones) no
  // encontraba nada que actualizar y respondía vacío.
  const [updated] = await db
    .insert(configuraciones)
    .values({ usuarioId, ...set })
    .onConflictDoUpdate({ target: configuraciones.usuarioId, set })
    .returning()

  return updated
})
