import { db } from '../../utils/db.js'
import { presupuestosCategoria } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { assertCategoriasPropias } from '../../utils/categorias.js'

// Upsert: si ya existe para (usuario, categoria), actualiza; si no, crea.
// Esto es lo que el composable necesita en el cliente (setPresupuesto).
export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)
  const body = await readBody(event)

  const categoriaId = body?.categoriaId
  const monto = Number(body?.montoMensual)
  const umbral = Number.isFinite(Number(body?.alertaUmbral))
    ? Math.max(0, Math.min(100, Number(body.alertaUmbral)))
    : 80

  if (!categoriaId) throw createError({ statusCode: 400, message: 'categoriaId es requerido' })
  if (!(monto > 0)) throw createError({ statusCode: 400, message: 'montoMensual debe ser > 0' })

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
