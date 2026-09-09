// Autorización de `categoria_id` en las escrituras.
//
// El conjunto de categorías que un usuario puede referenciar es:
//   usuario_id = él   OR   (es_predefinida AND usuario_id IS NULL)
//
// Esa condición ya estaba escrita a mano en /api/voz/parse*,
// /api/presupuestos-categoria y compartido.service, pero NO en los
// endpoints que más categorías escriben: POST /api/gastos,
// POST /api/gastos/bulk y PUT /api/gastos/bulk aceptaban cualquier UUID.
// Mandando el id de una categoría privada ajena, la respuesta devolvía su
// `categoriaNombre` — un oráculo para leer categorías de otras cuentas.
//
// Este módulo es el único sitio donde vive la regla, para que la próxima
// escritura que acepte categoriaId no tenga que volver a deducirla.

import { and, eq, inArray, isNull, or } from 'drizzle-orm'
import { db } from './db.js'
import { categorias } from '../database/schema.js'

/**
 * Condición Drizzle de las categorías que un usuario puede LEER: las
 * suyas más las predefinidas globales.
 *
 * Es la misma regla que aplica `assertCategoriasPropias` al escribir; se
 * expone como condición para que las lecturas no la vuelvan a escribir a
 * mano. Estaba redactada de cuatro formas distintas —y tres de ellas más
 * amplias que esta— en /api/voz/parse, parse-image, parse-stream y
 * /api/categorias/provision:
 *
 *   or(esPredefinida, usuarioId = me, usuarioId IS NULL)
 *
 * Esa versión acepta una categoría de OTRA cuenta con `es_predefinida`
 * en true. Hoy no es alcanzable porque el POST de categorías fuerza
 * `esPredefinida: false`, pero la diferencia no es intencionada: en los
 * endpoints de voz el nombre de la categoría se inyecta en el prompt que
 * se manda a Gemini, así que una fila así se llevaría el nombre de una
 * categoría ajena a la petición de otro usuario.
 */
export function categoriasLegibles(usuarioId) {
  return or(
    eq(categorias.usuarioId, usuarioId),
    and(eq(categorias.esPredefinida, true), isNull(categorias.usuarioId)),
  )
}

/**
 * Condición de las categorías predefinidas globales (las que se clonan al
 * aprovisionar una cuenta nueva). `isNull` no es decorativo: sin él, una
 * categoría de otro usuario marcada como predefinida se clonaría a todas
 * las cuentas nuevas.
 */
export function categoriasPredefinidasGlobales() {
  return and(eq(categorias.esPredefinida, true), isNull(categorias.usuarioId))
}

/**
 * Parte pura: dados los ids pedidos y las filas accesibles que devolvió la
 * BD, devuelve los ids que el usuario NO puede usar (deduplicados).
 *
 * null/undefined se ignoran: "sin categoría" es un caso que valida el
 * schema del endpoint, no la autorización.
 *
 * @param {Array<string|number|null>} pedidos
 * @param {Array<{id: string}>} accesibles
 * @returns {Array<string>} ids inválidos, sin repetir
 */
export function filtrarCategoriasInvalidas(pedidos, accesibles) {
  const permitidos = new Set((accesibles || []).map((c) => String(c.id)))
  const invalidos = new Set()
  for (const id of pedidos || []) {
    if (id === null || id === undefined || id === '') continue
    const s = String(id)
    if (!permitidos.has(s)) invalidos.add(s)
  }
  return [...invalidos]
}

/**
 * Exige que todas las categorías referenciadas sean del usuario o
 * predefinidas globales. Lanza 400 si alguna no lo es.
 *
 * Responde 400 y no 404 a propósito: el cliente manda ids que él mismo
 * eligió de /api/categorias, así que un id fuera de ese conjunto es una
 * petición mal formada. No revela si el id existe en otra cuenta.
 *
 * @param {object} input
 * @param {string} input.usuarioId
 * @param {Array<string|number|null>} input.categoriaIds
 * @param {object} [input.dbClient] Handle de transacción, si aplica.
 */
export async function assertCategoriasPropias({ usuarioId, categoriaIds, dbClient = db }) {
  const unicos = [
    ...new Set((categoriaIds || []).filter((id) => id !== null && id !== undefined && id !== '')),
  ].map(String)
  if (unicos.length === 0) return

  const accesibles = await dbClient
    .select({ id: categorias.id })
    .from(categorias)
    .where(
      and(
        inArray(categorias.id, unicos),
        or(
          eq(categorias.usuarioId, usuarioId),
          and(eq(categorias.esPredefinida, true), isNull(categorias.usuarioId)),
        ),
      ),
    )

  const invalidos = filtrarCategoriasInvalidas(unicos, accesibles)
  if (invalidos.length > 0) {
    const err = new Error(
      invalidos.length === 1
        ? 'La categoría indicada no existe o no es tuya'
        : `${invalidos.length} categorías indicadas no existen o no son tuyas`,
    )
    err.statusCode = 400
    throw err
  }
}
