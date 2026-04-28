import { eq } from 'drizzle-orm'
import { db } from '../../../utils/db.js'
import { personasEntidades } from '../../../database/schema.js'
import { getUsuarioFromEvent } from '../../../utils/getUsuario.js'
import { clusterizarSugerencias } from '../../../utils/stringSimilarity.js'

export default defineEventHandler(async (event) => {
  const usuarioId = await getUsuarioFromEvent(event)

  const personas = await db
    .select({ id: personasEntidades.id, nombre: personasEntidades.nombre, tipo: personasEntidades.tipo })
    .from(personasEntidades)
    .where(eq(personasEntidades.usuarioId, usuarioId))

  const clusters = clusterizarSugerencias(personas, { umbralSimilitud: 0.85, maxDistancia: 2 })
  return { sugerencias: clusters }
})
