import { db } from '../../utils/db.js'
import { presupuestosCategoria, categorias } from '../../database/schema.js'
import { getUsuarioFromEvent } from '../../utils/getUsuario.js'
import { eq, and, or, isNull } from 'drizzle-orm'

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

  // Validar que la categoría existe y pertenece al usuario o es predefinida.
  const [cat] = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(
      and(
        eq(categorias.id, categoriaId),
        or(eq(categorias.usuarioId, usuarioId), isNull(categorias.usuarioId)),
      ),
    )
    .limit(1)
  if (!cat) throw createError({ statusCode: 404, message: 'Categoría no encontrada' })

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
