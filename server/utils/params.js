// Lectura validada de params de ruta.
//
// Todos los ids de esta base son `uuid` en Postgres. Un handler que hace
// `eq(tabla.id, getRouterParam(event, 'id'))` con un id que no es UUID no
// obtiene "no encontrado": obtiene un error del driver
// (`invalid input syntax for type uuid`) que sale como 500 y arrastra el
// mensaje de postgres.js hasta el cliente.
//
// CLAUDE.md ya recoge la lección para el módulo Compartido — "Ids desde
// la URL: validar antes de consultar" — pero la regla vivía dentro de
// `server/utils/compartido.js` y no salió de ahí. Este módulo la extrae
// para que cualquier handler la use sin volver a deducirla.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** ¿Este valor puede ser un id de esta base? */
export function esUuid(valor) {
  return typeof valor === 'string' && UUID_RE.test(valor)
}

// Concordancia de género en el mensaje: los recursos del dominio son
// pocos y conocidos, así que se listan en vez de adivinarse por
// terminación — "Conexión" y "Solicitud" son femeninos y no acaban en
// 'a', que es donde falla cualquier heurístico.
const FEMENINOS = new Set([
  'categoría',
  'conexión',
  'deuda',
  'opción',
  'persona',
  'plantilla',
  'solicitud',
])

/**
 * Lee un param de ruta exigiendo que sea un UUID.
 *
 * Responde 404 y no 400, por la misma razón que `assertOwner`: un id que
 * no puede existir es indistinguible, desde fuera, de uno que no existe.
 * Un 400 aquí diría "ese formato es inválido" y un 404 "no existe", lo
 * que convierte el endpoint en un detector de formatos de id ajenos.
 *
 * El mensaje nunca incluye el valor recibido: acabaría en logs y, si el
 * cliente lo pinta, sería un reflejo del input.
 *
 * @param {object} event Nitro event.
 * @param {string} [nombre='id'] Nombre del param en la ruta.
 * @param {object} [opts]
 * @param {string} [opts.recurso='Recurso'] Nombre para el mensaje.
 */
export function getUuidParam(event, nombre = 'id', opts = {}) {
  const { recurso = 'Recurso' } = opts
  const valor = getRouterParam(event, nombre)
  if (!esUuid(valor)) {
    throw createError({
      statusCode: 404,
      message: `${recurso} no ${FEMENINOS.has(recurso.toLowerCase()) ? 'encontrada' : 'encontrado'}`,
    })
  }
  return valor
}
