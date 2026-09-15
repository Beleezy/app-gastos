import { db } from '../../utils/db.js'
import { presupuestosCategoria } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { assertCategoriasPropias } from '../../utils/categorias.js'
import { validateBody } from '../../utils/validate.js'
import { presupuestoCategoriaSchema } from '~/shared/schemas/planificador.js'

// Upsert: si ya existe para (usuario, categoria), actualiza; si no, crea.
// Esto es lo que el composable necesita en el cliente (setPresupuesto).
export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  // Sin schema, `categoriaId: "abc"` pasaba el `!categoriaId` y reventaba el
  // `inArray` de la comprobación de propiedad con un 500 y el SQL dentro.
  const {
    categoriaId,
    montoMensual: monto,
    alertaUmbral: umbral,
  } = await validateBody(event, presupuestoCategoriaSchema)

  // La regla vive en `utils/categorias.js`. La versión que había aquí a
  // mano era MÁS ANCHA que la canónica: `isNull(usuarioId)` sin exigir
  // `esPredefinida` acepta cualquier fila global, no solo las predefinidas.
  await assertCategoriasPropias({ usuarioId, categoriaIds: [categoriaId] })

  // Upsert con ON CONFLICT.
  const [row] = await db
    .insert(presupuestosCategoria)
    .values({
      usuarioId,
      categoriaId,
      montoMensual: String(monto),
      alertaUmbral: umbral,
    })
    .onConflictDoUpdate({
      target: [presupuestosCategoria.usuarioId, presupuestosCategoria.categoriaId],
      set: {
        montoMensual: String(monto),
        alertaUmbral: umbral,
        updatedAt: new Date(),
      },
    })
    .returning()

  return { ...row, montoMensual: parseFloat(row.montoMensual) }
})
