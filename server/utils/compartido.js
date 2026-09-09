// Guard del módulo Compartido.
//
// Este es el ÚNICO lugar del servidor autorizado a leer datos de un usuario
// distinto al que hace la petición. Todo endpoint de /api/compartido que
// toque gastos ajenos entra por acá: si aparece un `db.select()` sobre
// gastos con un usuarioId que no salga de una conexión validada aquí, es un
// bug de seguridad, no un atajo.
//
// Reglas que impone:
//  1. Solo las dos partes de una conexión pueden verla, y con 404 (no 403)
//     para no filtrar que existe.
//  2. Leer gastos exige ser el RECEPTOR de una conexión aceptada y no
//     pausada. El emisor ve su propio módulo de gastos, no necesita esto.
//  3. Las columnas que salen son una whitelist explícita: `notas` y
//     `transcripcion_voz` no se comparten nunca.

import { and, eq, inArray, isNull, ne, or, sql } from 'drizzle-orm'
import { db } from './db.js'
import {
  compartidoCategorias,
  compartidoConexiones,
  categorias,
  gastos,
} from '../database/schema.js'
import { esUuid } from './params.js'

// Un id que no es UUID no puede existir, y pasárselo a Postgres revienta la
// query con un 500 que además filtra el error del driver. Se descarta antes.
//
// La regla ya no vive aquí: se generalizó a `server/utils/params.js`, de
// donde la toman ahora los 47 endpoints con `[id]` del resto de módulos.
// Se re-exporta para no tocar a quien la importa desde este guard.
export { esUuid }

/**
 * Columnas de `gastos` que un receptor puede ver. Whitelist explícita a
 * propósito: con `select()` sin proyección, cualquier columna que se agregue
 * mañana (una nota, una transcripción, una geolocalización) se filtraría
 * sola al otro usuario. Acá hay que añadirla a mano y pensarlo.
 */
export const SELECT_GASTO_COMPARTIDO = {
  id: gastos.id,
  concepto: gastos.concepto,
  monto: gastos.monto,
  fecha: gastos.fecha,
  categoriaId: gastos.categoriaId,
  visibilidad: gastos.visibilidad,
}

function errorNoEncontrada() {
  // 404 y no 403: un 403 confirmaría que la conexión existe.
  return createError({ statusCode: 404, message: 'Conexión no encontrada' })
}

/**
 * Carga una conexión de la que el usuario es parte (emisor o receptor).
 * Para gestión: ver el alcance, editarlo, revocar, listar avisos.
 *
 * @returns {{ conexion: object, rol: 'emisor'|'receptor' }}
 */
export async function cargarConexionDeLaQueEsParte(conexionId, usuarioId) {
  if (!conexionId || !usuarioId || !esUuid(conexionId)) throw errorNoEncontrada()

  const [conexion] = await db
    .select()
    .from(compartidoConexiones)
    .where(eq(compartidoConexiones.id, conexionId))
    .limit(1)

  if (!conexion) throw errorNoEncontrada()

  if (conexion.emisorId === usuarioId) return { conexion, rol: 'emisor' }
  if (conexion.receptorId === usuarioId) return { conexion, rol: 'receptor' }
  throw errorNoEncontrada()
}

/**
 * Carga una conexión que el usuario puede LEER como receptor. Es el guard de
 * la vista compartida y de los avisos sobre gastos concretos.
 *
 * Exige, además de ser el receptor: estado 'aceptada' y no pausada. Una
 * conexión pendiente, rechazada, revocada, expirada o pausada no muestra ni
 * un sol — y responde 404, igual que una ajena.
 */
export async function cargarConexionLegible(conexionId, usuarioId) {
  const { conexion, rol } = await cargarConexionDeLaQueEsParte(conexionId, usuarioId)
  if (rol !== 'receptor') throw errorNoEncontrada()
  if (conexion.estado !== 'aceptada' || conexion.pausada) throw errorNoEncontrada()
  return conexion
}

/** Categorías compartidas en una conexión, con el umbral del observador. */
export async function cargarCategoriasCompartidas(conexionId) {
  return db
    .select({
      categoriaId: compartidoCategorias.categoriaId,
      umbralAviso: compartidoCategorias.umbralAviso,
      nombre: categorias.nombre,
      icono: categorias.icono,
      color: categorias.color,
    })
    .from(compartidoCategorias)
    .innerJoin(categorias, eq(categorias.id, compartidoCategorias.categoriaId))
    .where(eq(compartidoCategorias.conexionId, conexionId))
}

/**
 * Filtro SQL de los gastos visibles para una conexión. Traducción de
 * `esGastoVisible` (shared/compartido/visibilidad.js) — si cambia una,
 * cambia la otra.
 *
 * Nota sobre perfiles gestionados: filtra por `emisorId`, o sea SOLO los
 * gastos de la cuenta real. Los de sus perfiles de familia son filas de
 * otro usuarioId y no se comparten.
 *
 * @param {object} conexion - fila de compartido_conexiones
 * @param {string[]} categoriaIds - categorías compartidas
 */
export function construirFiltroVisibilidad(conexion, categoriaIds = []) {
  const ramas = []
  if (categoriaIds.length) ramas.push(inArray(gastos.categoriaId, categoriaIds))
  if (conexion.incluirMarcados) ramas.push(eq(gastos.visibilidad, 'compartido'))

  // Sin categorías compartidas y sin marcados: no hay nada visible. Devolver
  // un predicado falso es más honesto (y más barato) que armar un OR vacío,
  // que en Drizzle colapsaría a "sin condición" y mostraría TODO.
  if (!ramas.length) return sql`false`

  return and(
    eq(gastos.usuarioId, conexion.emisorId),
    isNull(gastos.deletedAt),
    ne(gastos.visibilidad, 'privado'),
    ramas.length === 1 ? ramas[0] : or(...ramas),
  )
}
