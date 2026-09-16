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
      // La ruta real es /api/planificador/gastos/[id]; la anterior no
      // existía y el cleanup fallaba en silencio.
      await request.delete(`/api/planificador/gastos/${id}`)
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
 * Crea un gasto planificado en el plan del MES EN CURSO y devuelve su id
 * (null si no se pudo). `db:seed:test` siembra planes de febrero a abril, así
 * que en una base recién creada —cada job de CI levanta la suya— el mes actual
 * está vacío: un test que necesite una fila del planificador tiene que
 * crearla, no confiar en la semilla. En local pasaba por accidente, porque la
 * base arrastraba datos de corridas anteriores.
 */
export async function crearGastoPlanificado(request, concepto = 'E2E planificado') {
  const categoriaId = await primeraCategoriaId(request)
  if (!categoriaId) return null
  const hoy = fechaHoyLima()
  const [anio, mes] = hoy.split('-')
  // GET /api/planificador crea el plan del mes si no existe.
  const plan = await request.get(`/api/planificador?mes=${Number(mes)}&anio=${anio}`)
  if (!plan.ok()) return null
  const planMensualId = (await plan.json())?.plan?.id
  if (!planMensualId) return null
  const r = await request.post('/api/planificador/gastos', {
    data: {
      planMensualId,
      categoriaId,
      concepto: `${concepto} ${Date.now()}`,
      montoEstimado: 12,
      fechaProbablePago: hoy,
    },
  })
  if (!r.ok()) return null
  return (await r.json())?.id || null
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
