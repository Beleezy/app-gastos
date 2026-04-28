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
  .number({ invalid_type_error: 'Monto debe ser numérico' })
  .finite()
  .positive('El monto debe ser mayor a 0')
  .max(10_000_000, 'Monto fuera de rango')

export const conceptoSchema = z.string().trim().min(1, 'Concepto obligatorio').max(200)

export const notasSchema = z.string().trim().max(1000).optional().nullable()

export const metodoRegistroSchema = z.enum(['voz', 'foto', 'manual'])
