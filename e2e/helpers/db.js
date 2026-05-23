// Helpers para limpieza/reset de DB en tests E2E.
//
// Estrategia: cada test destructivo crea entidades con sufijo "E2E-{run-id}"
// y se borran al final del test via API. NO se hace pg_dump/psql restore
// para mantener simplicidad y portabilidad (funciona en Windows/macOS/Linux
// sin requerir psql/pg_dump en PATH local).

import { randomUUID } from 'node:crypto'

/**
 * Genera un sufijo unico para entidades creadas por un test, para que sean
 * identificables y limpiables sin afectar datos sembrados.
 */
export function uniqueSuffix() {
  return `E2E-${randomUUID().slice(0, 8)}`
}

/**
 * Borra una lista de gastos por id usando la API. Usa request del context
 * de Playwright (incluye el header de auth bypass).
 */
export async function cleanupGastos(request, ids) {
  for (const id of ids) {
    try {
      await request.delete(`/api/gastos/${id}`)
    } catch {
      // ignorar fallos individuales — el cleanup es best-effort
    }
  }
}

export async function cleanupDeudas(request, ids) {
  for (const id of ids) {
    try {
      await request.delete(`/api/deudas/${id}`)
    } catch {}
  }
}

export async function cleanupGastosPlanificados(request, ids) {
  for (const id of ids) {
    try {
      await request.delete(`/api/planificador/${id}`)
    } catch {}
  }
}

export async function cleanupCategorias(request, ids) {
  for (const id of ids) {
    try {
      await request.delete(`/api/categorias/${id}`)
    } catch {}
  }
}

/**
 * Obtiene la primera categoria disponible para usar en tests que requieren
 * un categoriaId valido pero no le importa cual.
 */
export async function primeraCategoriaId(request) {
  const r = await request.get('/api/categorias')
  if (!r.ok()) return null
  const data = await r.json()
  const lista = Array.isArray(data) ? data : data?.categorias || []
  return lista[0]?.id || null
}

/**
 * Fecha "hoy" en Lima/PE (UTC-5) en formato YYYY-MM-DD. Equivalente al
 * `fechaHoy()` que usa el frontend (useFechaPeru) — usar para que los gastos
 * creados via API en tests coincidan con la fecha que renderea el historial.
 */
export function fechaHoyLima() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (t) => partes.find((p) => p.type === t)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}
