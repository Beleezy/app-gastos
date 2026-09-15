// Schemas Zod compartidos cliente <-> servidor.
// Ver §1.3 y §4.4 de planifica.md.

import { z } from 'zod'

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/
const HORA_HHMM = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

export const fechaIso = z.string().regex(FECHA_ISO, 'Fecha inválida (esperado YYYY-MM-DD)')

export const horaHhmm = z.string().regex(HORA_HHMM, 'Hora inválida (esperado HH:mm)')

export const monto = z
  .number({ error: 'Monto debe ser numérico' })
  .finite()
  .positive('El monto debe ser mayor a 0')
  .max(10_000_000, 'Monto fuera de rango')

export const conceptoSchema = z.string().trim().min(1, 'Concepto obligatorio').max(200)

export const notasSchema = z.string().trim().max(1000).optional().nullable()

export const metodoRegistroSchema = z.enum(['voz', 'foto', 'manual'])

// Todos los ids de esta base son uuid. Un id con otra forma no es "otro
// formato de id": es un valor que no puede existir, y pasárselo a Postgres
// revienta la consulta con un 500 que arrastra el error del driver. Los
// schemas declaraban los ids como `z.union([z.string(), z.number()])`, que
// deja pasar "abc" y 7 — el fuzz de la ronda 5 encontró 16 handlers así.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const uuidSchema = z.string().regex(UUID_RE, 'UUID inválido')

/**
 * uuid obligatorio con mensaje propio para cuando falta: `uuidSchema` a
 * secas responde "Invalid input" ante `undefined`, que no le dice nada al
 * usuario. El mensaje de forma inválida se mantiene genérico a propósito
 * (no repite el valor recibido).
 */
export const uuidRequerido = (mensajeAusente) =>
  z.string({ error: mensajeAusente }).regex(UUID_RE, 'Identificador inválido')

export const paginacionQuerySchema = z.object({
  cursor: z.string().max(500).optional().nullable(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

// Los parámetros de query llegan SIEMPRE como string, y el cliente manda
// `?fecha=` (vacío) cuando el filtro no está puesto. Sin esto, un '' entra
// como valor y acaba en un `eq()` contra una columna date o uuid.
export const vacioComoAusente = (schema) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), schema.optional())

// Query params compartidos por los listados: el cliente los manda para
// saltarse su propio Cache-Control. No los lee ningún handler, pero tienen
// que pasar la validación.
export const cacheBusters = {
  _v: z.any().optional(),
  _t: z.any().optional(),
  _p: z.any().optional(),
  fresh: z.any().optional(),
}

// Query de los listados por mes. `parseInt(q.mes) || mesLocal` acota lo que
// NO es número, pero deja pasar un `?mes=99&anio=1`, que arma un rango de
// fechas imposible ("0001-99-01") y revienta la consulta con un 500 que
// arrastra el SQL. El clamp correcto es este, en un solo sitio.
export const mesAnioQuerySchema = z.object({
  mes: vacioComoAusente(z.coerce.number().int().min(1).max(12)),
  anio: vacioComoAusente(z.coerce.number().int().min(2000).max(2100)),
  limit: vacioComoAusente(z.coerce.number().int().min(1).max(1000)),
  offset: vacioComoAusente(z.coerce.number().int().min(0)),
  ...cacheBusters,
})
