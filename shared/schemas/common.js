// Schemas Zod compartidos cliente <-> servidor.
// Ver §1.3 y §4.4 de planifica.md.

import { z } from 'zod'

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/
const HORA_HHMM = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/

export const fechaIso = z
  .string()
  .regex(FECHA_ISO, 'Fecha inválida (esperado YYYY-MM-DD)')

export const horaHhmm = z
  .string()
  .regex(HORA_HHMM, 'Hora inválida (esperado HH:mm)')

export const monto = z
  .number({ error: 'Monto debe ser numérico' })
  .finite()
  .positive('El monto debe ser mayor a 0')
  .max(10_000_000, 'Monto fuera de rango')

export const conceptoSchema = z.string().trim().min(1, 'Concepto obligatorio').max(200)

export const notasSchema = z.string().trim().max(1000).optional().nullable()

export const metodoRegistroSchema = z.enum(['voz', 'foto', 'manual'])

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const uuidSchema = z.string().regex(UUID_RE, 'UUID inválido')

export const idSchema = z.union([
  uuidSchema,
  z.number().int().positive(),
  z.string().regex(/^\d+$/, 'ID inválido'),
])

export const paginacionQuerySchema = z.object({
  cursor: z.string().max(500).optional().nullable(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})
