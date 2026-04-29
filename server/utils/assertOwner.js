// Helper de autorización IDOR. Ver §1.7 de planifica.md.
//
// Convención: cada service que carga una entidad debe verificar que
// el usuario solicitante es dueño antes de devolverla. Este helper
// estandariza el lanzamiento de 403/404.

/**
 * Lanza un error 404/403 cuando una entidad no pertenece al usuario.
 * Usar tras un SELECT con filtro por id (sin filtro por usuario_id) o
 * tras un join donde la pertenencia se valida explícitamente.
 *
 * @param {object} entidad Resultado de la DB (objeto o undefined).
 * @param {string} usuarioId UUID del solicitante.
 * @param {object} [opts]
 * @param {string} [opts.recurso] Nombre del recurso para el mensaje.
 * @param {string} [opts.field='usuarioId'] Campo a comparar en la entidad.
 */
export function assertOwner(entidad, usuarioId, opts = {}) {
  const { recurso = 'Recurso', field = 'usuarioId' } = opts
  if (!entidad) {
    const err = new Error(`${recurso} no encontrado`)
    err.statusCode = 404
    throw err
  }
  if (!usuarioId) {
    const err = new Error('No autenticado')
    err.statusCode = 401
    throw err
  }
  if (entidad[field] !== usuarioId) {
    // Devolvemos 404 (no 403) para no filtrar la existencia del recurso.
    const err = new Error(`${recurso} no encontrado`)
    err.statusCode = 404
    throw err
  }
  return entidad
}

/**
 * Variante para resultados de array (ej. al hacer .where(in(...)));
 * verifica que TODOS pertenezcan al usuario.
 */
export function assertOwnerAll(entidades, usuarioId, opts = {}) {
  const { recurso = 'Recurso', field = 'usuarioId' } = opts
  if (!Array.isArray(entidades)) {
    const err = new Error(`${recurso} no encontrado`)
    err.statusCode = 404
    throw err
  }
  for (const e of entidades) {
    assertOwner(e, usuarioId, { recurso, field })
  }
  return entidades
}
