// Autorización de `medio_ahorro_id` en las escrituras de ahorros.
//
// Mismo agujero que tenía `categoria_id` antes de `assertCategoriasPropias`,
// y con la misma consecuencia: POST /api/ahorros aceptaba CUALQUIER uuid
// como `medioAhorroId`, sin comprobar de quién era. Como la respuesta hace
// un join para devolver `medioNombre`/`medioIcono`/`medioColor`, mandar el
// id del medio de otra cuenta devolvía su nombre —"Cuenta secreta de Ana",
// "BCP ahorros 4512"— al que lo pedía. Y no era un oráculo de una sola
// lectura: la fila queda guardada apuntando ahí, así que el nombre ajeno
// reaparecía en el listado del mes y en `porMedio` de forma permanente.
//
// La regla es más simple que la de categorías (no hay medios "globales"),
// pero vive aquí igual para que la próxima escritura que acepte un
// medioAhorroId no la tenga que volver a deducir.

import { and, eq } from 'drizzle-orm'
import { db } from './db.js'
import { mediosAhorro } from '../database/schema.js'
import { esUuid } from './params.js'

/**
 * Condición Drizzle para joins de lectura: solo medios del usuario.
 *
 * Los `leftJoin` de las lecturas cruzaban por id a secas. Filtrar también
 * por dueño es defensa en profundidad: aunque una fila vieja haya quedado
 * apuntando a un medio ajeno, la lectura devuelve NULL en vez del nombre.
 */
export function medioAhorroPropio(usuarioId) {
  return eq(mediosAhorro.usuarioId, usuarioId)
}

/**
 * Exige que el medio de ahorro referenciado sea del usuario.
 *
 * 400 y no 404, igual que en categorías: el cliente elige el id de una
 * lista que le dio /api/ahorros/medios, así que uno fuera de ese conjunto
 * es una petición mal formada. El mensaje no distingue "no existe" de "es
 * de otro" para no confirmar la existencia de ids ajenos.
 *
 * @param {object} input
 * @param {string} input.usuarioId
 * @param {string|null|undefined} input.medioAhorroId
 * @param {object} [input.dbClient] Handle de transacción, si aplica.
 */
export async function assertMedioAhorroPropio({ usuarioId, medioAhorroId, dbClient = db }) {
  if (medioAhorroId === null || medioAhorroId === undefined || medioAhorroId === '') return

  // La forma se comprueba aquí y no solo en el schema: no todos los que
  // llaman validan el cuerpo con Zod (`registro.post` lee `readBody` crudo),
  // y un id que no es uuid reventaría la consulta de más abajo con un 500.
  if (!esUuid(medioAhorroId)) {
    const err = new Error('El medio de ahorro indicado no existe o no es tuyo')
    err.statusCode = 400
    throw err
  }

  const [medio] = await dbClient
    .select({ id: mediosAhorro.id })
    .from(mediosAhorro)
    .where(and(eq(mediosAhorro.id, medioAhorroId), eq(mediosAhorro.usuarioId, usuarioId)))
    .limit(1)

  if (!medio) {
    const err = new Error('El medio de ahorro indicado no existe o no es tuyo')
    err.statusCode = 400
    throw err
  }
}
