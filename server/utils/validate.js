// Wrapper de validación con Zod para handlers de Nitro.
// Ver §1.3 / §4.4 de planifica.md.

import { ZodError } from 'zod'

function formatZodError(error) {
  return error.issues.map((i) => ({
    path: i.path.join('.') || '(root)',
    message: i.message,
    code: i.code,
  }))
}

/**
 * Valida un objeto contra un schema Zod. Lanza 400 con detalle si falla.
 * Devuelve el objeto parseado (con coerciones aplicadas).
 */
export function validate(schema, data) {
  try {
    return schema.parse(data)
  } catch (e) {
    if (e instanceof ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Validation Error',
        message: 'Datos inválidos',
        data: { issues: formatZodError(e) },
      })
    }
    throw e
  }
}

/**
 * Lee el body del event y lo valida contra el schema.
 */
export async function validateBody(event, schema) {
  const body = await readBody(event)
  return validate(schema, body)
}

/**
 * Valida el query string contra el schema.
 */
export function validateQuery(event, schema) {
  const query = getQuery(event)
  return validate(schema, query)
}
