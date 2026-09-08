// Regla de visibilidad del módulo Compartido — versión pura.
//
// ESTA ES LA DEFINICIÓN CANÓNICA de qué gasto ve un receptor.
// `construirFiltroVisibilidad` (server/utils/compartido.js) la traduce a SQL
// para no traer filas de más desde la BD. Las dos DEBEN coincidir: si tocas
// una, toca la otra y corre tests/compartidoVisibilidad.test.js, que fija la
// tabla de verdad completa.
//
// El cliente la usa para el preview de "esto es lo que verá" y para el icono
// de ojo en el historial, sin tener que preguntarle al servidor.

/**
 * ¿Este gasto es visible para el receptor de la conexión?
 *
 * @param {object} gasto - { categoriaId, visibilidad, deletedAt? }
 * @param {object} alcance
 * @param {string[]} alcance.categoriaIds - categorías compartidas en la conexión
 * @param {boolean} alcance.incluirMarcados - si la conexión recibe los gastos
 *   marcados a mano con visibilidad='compartido'
 * @returns {boolean}
 */
export function esGastoVisible(gasto, { categoriaIds = [], incluirMarcados = true } = {}) {
  if (!gasto) return false
  // La papelera no se comparte: un gasto borrado no existe para nadie.
  if (gasto.deletedAt) return false
  // 'privado' gana sobre todo lo demás, incluso sobre su categoría compartida.
  if (gasto.visibilidad === 'privado') return false

  const porCategoria = categoriaIds.includes(gasto.categoriaId)
  const porMarcado = incluirMarcados && gasto.visibilidad === 'compartido'
  return porCategoria || porMarcado
}

/**
 * ¿La conexión permite leer datos ahora mismo? Espeja lo que exige el guard
 * del servidor, para que el cliente no pinte una vista que la API va a negar.
 */
export function conexionPermiteLectura(conexion) {
  return !!conexion && conexion.estado === 'aceptada' && !conexion.pausada
}
