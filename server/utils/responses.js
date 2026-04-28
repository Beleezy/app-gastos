// Helpers uniformes de respuesta HTTP para handlers de Nitro.

export function ok(data) {
  return data
}

export function created(event, data) {
  setResponseStatus(event, 201)
  return data
}

export function noContent(event) {
  setResponseStatus(event, 204)
  return null
}

export function badRequest(message = 'Solicitud inválida', data) {
  return createError({ statusCode: 400, statusMessage: 'Bad Request', message, data })
}

export function unauthorized(message = 'No autenticado') {
  return createError({ statusCode: 401, statusMessage: 'Unauthorized', message })
}

export function forbidden(message = 'Sin permisos') {
  return createError({ statusCode: 403, statusMessage: 'Forbidden', message })
}

export function notFound(message = 'No encontrado') {
  return createError({ statusCode: 404, statusMessage: 'Not Found', message })
}

export function conflict(message = 'Conflicto', data) {
  return createError({ statusCode: 409, statusMessage: 'Conflict', message, data })
}
